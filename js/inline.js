$(function(){

    //initiate the client
    var client = "responsetool"
    var oh = Ohmage("/app", client)

    //debugging
    window.oh = oh;

    //global data table
    var table;

    //attach global callbacks
    oh.callback("done", function(x, status, req){
        //for debugging only
        //console.log(x);
    })

    //global error handler. In ohmage 200 means unauthenticated
    oh.callback("error", function(msg, code, req){
        (code == 200) ? window.location.replace("/#login") : message("<strong>Error! </strong>" + msg);
    });

    //prevent timeout
    oh.keepalive();

    //get data
    var urn = window.location.hash.replace(/^[#]/, "")
    var tbody = $("#responsetablebody")

    //redirect to manager of no campaign is specified
    if(!urn.match(/^urn/)){
        console.log("Invalid URN: " + urn)
        location.replace("../campaign_mgmt")
    } else {
        $("#switchviewlink").removeClass("disabled").attr("href", "media.html#" + urn)
        $("#export_button").attr("href", "../../app/survey_response/read?campaign_urn=" + urn + "&client=manager&user_list=urn:ohmage:special:all&prompt_id_list=urn:ohmage:special:all&output_format=csv&sort_oder=timestamp&column_list=urn:ohmage:user:id,urn:ohmage:context:timestamp,urn:ohmage:prompt:response,urn:ohmage:context:location:latitude,urn:ohmage:context:location:longitude&suppress_metadata=true")
        oh.campaign.readall({campaign_urn_list:urn}).done(function(campaign_metadata){
            var user_roles = campaign_metadata[urn]["user_roles"];
            var user_is_admin = user_roles.indexOf("supervisor") > -1
            var campaign_name = campaign_metadata[urn].name;

            //make title pretty
            $("#pagetitle small").text(campaign_name)

            //populate table
            updateProgress(10, "Getting user info...")
            oh.user.whoami().done(function(username){
                updateProgress(20, "Downloading responses...")
                oh.response.read(urn).done(function(data){
                    updateProgress(40, "Building table...")
                    setTimeout(function(){
                        $.each(data, function(i, value){

                            //to filter responses from current user:
                            //if(username != value.user) return;

                            var tr = new_el("tr").appendTo(tbody).data("surveydata", value);
                            var td = new_el("td").appendTo(tr).click(function(e){
                                e.stopPropagation();
                            });

                            if(user_is_admin || username == value.user){
                                var checkbox = new_el("input").attr("type", "checkbox").addClass("rowcheckbox").appendTo(td).click(function(e){
                                    $("#checkboxheader").prop("indeterminate", true);
                                });
                            }

                            new_el("td").text(value.survey_title).appendTo(tr);
                            new_el("td").text(value.user).appendTo(tr);
                            new_el("td").text(value.timestamp).appendTo(tr);
                            
                            /* share button */
                            if(value.privacy_state == "shared") {
                                new_el("td").appendTo(tr).append('<span class="label label-success">shared</span>');
                            } else {
                                new_el("td").appendTo(tr).append('<span class="label label-default">private</span>');
                            }


                            /* Google map link */
                            var maptd = $("<td>").addClass("maptd").addClass("text-center").appendTo(tr).click(function(e){
                                e.stopPropagation();
                            });
                            if(value.latitude){
                               new_el("a").appendTo(maptd).html('<span class="glyphicon glyphicon-map-marker"></span>').attr("target", "_blank").attr("href", "http://maps.google.com/maps?q=" + value.latitude + "," + value.longitude);
                            }

                            /* hidden data column for searching. This can be slow */
                            new_el("td").appendTo(tr).text(jQuery.map(value.responses, function(resp){
                                return getPromptValue(resp);
                            }).join(" "));
                        });
                        updateProgress(90, "Loading table...")
                        initTable();
                        $("#progressdiv").hide()
                    }, 500);
                });
            });
        });
    }

    function getPromptIcon(value){
        var types = {
             "number" : "sound-5-1",
             "text" : "text-size",
             "photo" : "picture",
             "timestamp" : "time",
             "single_choice" : "menu-hamburger",
             "multi_choice" : "th",
             "audio" : "music",
             "video" : "facetime-video",
             "single_choice_custom" : "menu-hamburger",
             "multi_choice_custom" : "th",
             "message" : "info-sign",
             "document" : "file"
        };
        return types[value] || alert("invalid icon for : " + value);
    }

    function getPromptValue(value){
        if(["SKIPPED", "NOT_DISPLAYED"].indexOf(value["prompt_response"]) > -1)
            return value["prompt_response"];
        switch (value["prompt_type"]) {
            case "text":
            case "number":
            case "timestamp":
                return value["prompt_response"];
            case "single_choice":
            case "single_choice_custom":
                return getSingleChoiceValue(value);
            case "multi_choice":
            case "multi_choice_custom":
                return getMultiChoiceValue(value);  
            case "video":
            case "audio":
            case "document":
                return $("<a>").text(value["prompt_type"]).attr("target", "_blank").attr("href", "/app/media/read?client=" + client + "&id=" + value["prompt_response"])
            case "photo":
                return $("<a>").text("photo").attr("href", "/app/image/read?client=" + client + "&id=" + value["prompt_response"])                
             default:
                console.log("Unsupported prompt: " + value["prompt_type"])
        }
    }

    function getSingleChoiceValue(value){
        var response = value["prompt_response"];
        var glos = value["prompt_choice_glossary"];
        return glos && glos[response] ? glos[response].label : response;
    }

    function getMultiChoiceValue(value){
        var responses = value["prompt_response"];
        var glos = value["prompt_choice_glossary"];
        var output = [];
        $.each(responses, function(i, response){
            output.push(glos && glos[response] ? glos[response].label : response)
        })
        return output;
    }    

    //data tables widget
    function initTable(){
        table = $('#responsetable').DataTable( {
            "dom" : '<"pull-right"l><"pull-left"f>tip',
            "order": [[ 1, "desc" ]],
            "lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
            "aoColumnDefs": [
               { 'bSortable': false, 'aTargets': [ 0, 5, 6] },
               { 'bSearchable': false, 'aTargets': [ 0, 5] },
               { 'bVisible' : false, 'aTargets' : [6]}
            ]
        });

        /* Custom filtering function which will search data in column four between two values */
        $.fn.dataTable.ext.search.push(
            function( settings, data, dataIndex ) {
                var time = Date.parse(data[1].replace(" ", "T"));
                if(!time) return true;

                var min = Date.parse($("#mindate").val());
                if (min && time < min) return false;

                var maxtxt = $("#maxdate").val();
                var max = Date.parse(maxtxt + "T23:55");
                if (maxtxt && max && time > max) return false;
                
                return true;
            }
        );

        $('.datepicker').text("").datepicker({
            format: 'yyyy-mm-dd',
            autoclose: true,
            clearBtn: true
        }).change( function() {
            table.draw();
        });

        // Add event listener for opening and closing details
        $('#responsetable').on('click', 'tbody tr', function () {
            var tr = $(this)
            var row = table.row(tr);
            if(tr.attr("role") != "row") return;
     
            if ( row.child.isShown() ) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            } else {
                // Open this row
                row.child( makerow(row.data(), tr.data("surveydata"))).show();
                tr.addClass('shown');
            }
        });

        $("#checkboxheader").click(function(e){
            var checked = $(this).prop('checked');
            $(".rowcheckbox").prop('checked', checked);
        })

        table.on( 'page', resettable);
        table.on( 'length', resettable);
        table.on( 'order', resettable);
        table.on( 'search', resettable);

        $("#expand_all").click(function(e){
            expand_all();
            this.blur()
        })
        $("#collapse_all").click(function(e){
            collapse_all();
            this.blur()
        });
    }

    function expand_all(){
        $("tbody tr[role='row']").each(function(i){
            var tr = $(this)
            var row = table.row(tr);
            if(!row.child.isShown()){
                tr.trigger("click")
            }
        })        
    }

    function collapse_all(){
        $("tbody tr[role='row']").each(function(i){
            var tr = $(this)
            var row = table.row(tr);
            if(row.child.isShown()){
                tr.trigger("click")
            }
        })        
    }

    function resettable(){
        collapse_all()
        $(".rowcheckbox, #checkboxheader").prop('checked', false);
        $("#checkboxheader").prop("indeterminate", false);
    }

    function makerow(rowdata, survey){
        var row = $('<div/>').addClass('row').addClass("response-row");
        var responses = $.map(survey.responses, function(value) {
            return value;
        }).sort(function(a, b){
            return (a.prompt_index > b.prompt_index);
        });

        $.each(responses, function(index, value){
            
            // do not list NOT_DISPLAYED answers in the table
            if(value["prompt_response"] == "NOT_DISPLAYED") return;
            var el = $('<div />').addClass("col-sm-6").addClass("col-lg-4").appendTo(row);
            var icon = $("<span />").addClass("glyphicon").addClass("glyphicon-" + getPromptIcon(value["prompt_type"]))
            el.append($("<h5/>").text(" " + value["prompt_text"]).prepend(icon));
            
            if(value["prompt_type"] === "photo" && value["prompt_response"] != "SKIPPED"){
                var a = $("<a>").attr("target", "_blank").attr("href", "/app/image/read?client=" + client + "&id=" + value["prompt_response"]).appendTo(el);
                var img = $("<img>").addClass("photo-icon").addClass("img-thumbnail").attr("src", "/app/image/read?size=icon&client=" + client + "&id=" + value["prompt_response"])
                img.appendTo(a).on("error", function(){$(this).attr("src", "images/nophoto.jpg")});
            } else {
                el.append(getPromptValue(value));
            }          
        });
        return row;
    }

    function message(msg, type){
        // type must be one of success, info, warning, danger
        type = type || "danger"
        $("#errordiv").empty().append('<div class="alert alert-' + type + '"><a href="#" class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
        $('html, body').animate({
           scrollTop: 100
        }, 200);
    }

    function share_all(){
        $("tbody tr[role='row']").each(function(i){
            var tr = $(this);
            var surveydata = tr.data("surveydata");
            var checkbox = tr.find(":checkbox");
            var label = tr.find("span.label")
            if(checkbox.is(':checked')){
                oh.response.update(urn, surveydata.survey_key, true).done(function(){
                    label.addClass("label-success").removeClass("label-default").text("shared");
                });
            }
        });
    }

    function unshare_all(){
        $("tbody tr[role='row']").each(function(i){
            var tr = $(this);
            var surveydata = tr.data("surveydata");
            var checkbox = tr.find(":checkbox");
            var label = tr.find("span.label")
            if(checkbox.is(':checked')){
                oh.response.update(urn, surveydata.survey_key, false).done(function(){
                    label.addClass("label-default").removeClass("label-success").text("private");
                });
            }
        });
    }    

    function delete_all(){
        if(!confirm("Are you sure you want to delete these items? This cannot be undone!")) return;
        $("tbody tr[role='row']").each(function(i){
            var tr = $(this);
            var row = table.row(tr);
            var surveydata = tr.data("surveydata");
            var checkbox = tr.find(":checkbox");
            var label = tr.find("span.label")
            if(checkbox.is(':checked')){
      
                if(row.child.isShown()){
                    tr.trigger("click")
                }

                oh.response.delete(urn, surveydata.survey_key).done(function(){
                    tr.hide("slow");
                });
            }
        });
    }

    function new_el(what){
        return $(document.createElement(what))
    }

    updateProgress = _.throttle(function(pct, msg){
        return $(".progress-bar").css("width", + pct + "%").text(msg);
    }, 300);    

    $("#share_all_btn").click(share_all)
    $("#unshare_all_btn").click(unshare_all)
    $("#delete_all_btn").click(delete_all)
});

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
