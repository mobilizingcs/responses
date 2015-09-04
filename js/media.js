$(function(){

    //initiate the client
    var client = "responsetool"
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
        $("#switchviewlink").removeClass("disabled").attr("href", "index.html#" + urn)
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
                var thumb = makethumb(value).appendTo("#mediarow");
            });
        });
    });

    function makethumb(survey){
        var thumb = $("#templates .response-thumb").clone();
        thumb.find("h3").text(survey.user); 
        $.each(survey.responses, function(prompt_id, value){
            // do not list NOT_DISPLAYED answers in the table
            if(value["prompt_response"] == "NOT_DISPLAYED") return;

            //populate the table
            var table = thumb.find("table")
            switch (value["prompt_type"]) {
                case "number":
                        makeRow(prompt_id, getPromptValue(value)).appendTo(table)              
                    break;
                case "photo":
                    if(["SKIPPED", "NOT_DISPLAYED"].indexOf(value["prompt_response"]) < 0){
                        thumb.find("img").attr("src", "/app/image/read?client=" + client + "&id=" + value["prompt_response"])
                        thumb.find("h3").addClass("phototitle");
                    }
                    //fall through
                default:
                    makeRow(prompt_id, getPromptValue(value)).appendTo(table)
                    break;          
            }
        })

        //shared button
        var sharebtn = thumb.find(".sharebtn");
        var sharestate = (survey.privacy_state == "shared")
        updateshare();

        //shared button handler
        sharebtn.click(function(e){
            e.preventDefault();
            sharestate = !sharestate;
            sharebtn.addClass("disabled")
            oh.response.update(urn, survey.survey_key, sharestate).done(function(){
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

        //delete handler
        var delbtn = thumb.find(".delbtn").click(function(e){
            e.preventDefault()
            if(!confirm("Delete the response from " + survey.user + " (" + survey.timestamp + ")? This can not be undone."))
                return
            oh.response.delete(urn, survey.survey_key).done(function(){
                thumb.hide("slow", function(){
                    console.log("Response " + survey.survey_key + " deleted!");
                });
            });
        })           
        return thumb;
    }

    function makeRow(prompt_id, val){
        var title = (prompt_id.length > 25) ? prompt_id.substring(0, 25) + "..." : prompt_id;
        return $("<tr>").append($("<td>").append($("<b>").text(title + ": ")).append(val))
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

    function message(msg, type){
        // type must be one of success, info, warning, danger
        type = type || "danger"
        $("#errordiv").empty().append('<div class="alert alert-' + type + '"><a href="#" class="close" data-dismiss="alert">&times;</a>' + msg + '</div>');
        $('html, body').animate({
           scrollTop: 100
        }, 200);
    }
});
