$(function(){

    //initiate the client
    var oh = Ohmage("/app", "response-manager")

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
        location.replace("../manager")
    }

    //populate table
    oh.user.whoami().done(function(username){
        oh.response.read(urn).done(function(data){
            $.each(data, function(i, value){

                //to skip responses from other users:
                //if(username != user) return;

                var tr = $("<tr>").appendTo(tbody);
                $("<td>").text(value.timestamp).appendTo(tr);
                $("<td>").text(value.user).appendTo(tr);
                $("<td>").text(value.survey_title).appendTo(tr);
                $("<td>").text(value.privacy_state).appendTo(tr);

                var btn = $('<button class="btn btn-sm btn-danger"><span class="glyphicon glyphicon-remove"></span> delete</button>').click(function(e){
                    e.preventDefault()
                    oh.response.delete(urn, value.survey_key).done(function(){
                        tr.hide("slow", function(){
                            console.log("Response " + value.survey_key + " deleted!");
                        });
                    });
                })

                $("<td>").appendTo(tr).append(btn);
            });
            initTable();
        });
    });

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
