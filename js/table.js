$(function(){

    //initiate the client
    var client = "responses"
    var oh = Ohmage("/app", client)

    //debugging
    window.oh = oh;

    //attach global callbacks
    oh.callback("done", function(x, status, req){
        //for debugging only
        //console.log(x);
    })

    //global error handler. In ohmage 200 means unauthenticated
    oh.callback("error", function(msg, code, req){
        (code == 200) ? window.location.replace("../web/#login") : message("<strong>Error! </strong>" + msg);
    });

    //prevent timeout
    oh.keepalive();

    //get data
    var urn = window.location.hash.replace(/^[#]/, "")
    var tbody = $("#responsetablebody")

    //redirect to manager of no campaign is specified
    if(!urn.match(/^urn/)){
        location.replace("../campaigns")
    } else {
        $("#switchviewlink").removeClass("disabled").attr("href", "media.html#" + urn)
        oh.campaign.readall({campaign_urn_list:urn}).done(function(data){
            console.log(data)
            $("#pagetitle small").text(data[urn].name)
        })
    }

    $("#modalphoto img").on("error", function(){$(this).attr("src", "images/nophoto.jpg")});

    //populate table
    oh.user.whoami().done(function(username){
        oh.response.read(urn).done(function(data){
            $.each(data, function(i, value){

                //to filter responses from current user:
                //if(username != value.user) return;

                var tr = $("<tr>").appendTo(tbody);

                $("<td>").append('<button class="btn btn-primary"><span class="glyphicon glyphicon-camera"></a></button>').appendTo(tr).click(function(e){
                    e.preventDefault()
                    showmodal(value)
                });

                $("<td>").text(value.timestamp).appendTo(tr);
                $("<td>").text(value.user).appendTo(tr);
                $("<td>").text(value.survey_title).appendTo(tr);

                /* share button */
                var sharebtn = $('<a href="#" class="btn sharebtn btn-primary" role="button">Private</a>');
                $("<td>").appendTo(tr).append(sharebtn);

                /* internal share state */
                var sharestate = (value.privacy_state == "shared")
                updateshare();

                //shared button handler
                sharebtn.click(function(e){
                    e.preventDefault();
                    sharestate = !sharestate;
                    sharebtn.addClass("disabled")
                    oh.response.update(urn, value.survey_key, sharestate).done(function(){
                        //success, update gui
                        updateshare()
                    }).fail(function(){
                        //update failed; revert internal state
                        sharestate = !sharestate;
                    }).always(function(){
                        sharebtn.removeClass("disabled")
                    });
                })

                //update gui
                function updateshare(){
                    if(sharestate){
                        sharebtn.removeClass("btn-primary").addClass("btn-success").text("Shared");
                    } else {
                        sharebtn.removeClass("btn-success").addClass("btn-primary").text("Private");
                    }
                }

                /* delete button */
                var delbtn = $('<button class="btn btn-sm btn-danger"><span class="glyphicon glyphicon-remove"></span> delete</button>').click(function(e){
                    e.preventDefault()
                    if(!confirm("Delete the response from " + value.user + " (" + value.timestamp + ")? This can not be undone."))
                        return
                    oh.response.delete(urn, value.survey_key).done(function(){
                        tr.hide("slow", function(){
                            console.log("Response " + value.survey_key + " deleted!");
                        });
                    });
                })                
                $("<td>").appendTo(tr).append(delbtn);
            });
            initTable();
        });
    });

    function showmodal(survey){
        $("#modaltbody").empty();
        $(".modal-title").html("Response by <u>" + survey.user + "</u> at " + survey.timestamp);
        $("#modalphoto img").attr("src", "images/nophoto.jpg")
        $.each(survey.responses, function(key, value){
            
            // do not list NOT_DISPLAYED answers in the table
            if(value["prompt_response"] == "NOT_DISPLAYED") return;

            if(value["prompt_type"] === "photo" && ["SKIPPED", "NOT_DISPLAYED"].indexOf(value["prompt_response"]) < 0){
                $("#modalphoto img").attr("src", "/app/image/read?client=" + client + "&id=" + value["prompt_response"])                   
            }
            $("<tr/>")
                .appendTo("#modaltbody")
                .append($("<td/>").text(value["prompt_text"]))
                .append($("<td/>").append(getPromptValue(value)))             
            
        });
        //alert(JSON.stringify(value.responses)) 
        $(".modal").modal({show:true})       
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
                return $("<a>").text(value["prompt_type"]).attr("href", "/app/media/read?client=" + client + "&id=" + value["prompt_response"])
            case "photo":
                return $("<a>").text("photo").attr("href", "/app/image/read?client=" + client + "&id=" + value["prompt_response"])                
             default:
                console.log("Unsupported prompt: " + value["prompt_type"])
                console.log(value)
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
        $('#responsetable').dataTable( {
            "dom" : '<"pull-right"l><"pull-left"f>tip',
            "lengthMenu": [[25, 50, 100, -1], [25, 50, 100, "All"]],
            "aoColumnDefs": [
               { 'bSortable': false, 'aTargets': [ 4 ] }
            ]
        });
    }

    function message(msg, type){
        // type must be one of success, info, warning, danger
        type = type || "danger"
        $("#errordiv").empty().append('<div class="alert alert-' + type + '"><a href="#" class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
        $('html, body').animate({
           scrollTop: 100
        }, 200);
    }
});
