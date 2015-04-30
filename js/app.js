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
                console.log(value)
                var tr = $("<tr>").appendTo(tbody);
                $("<td>").text(value.timestamp).appendTo(tr);
                $("<td>").text(value.user).appendTo(tr);
                $("<td>").text(value.survey_title).appendTo(tr);
                $("<td>").text(value.privacy_state).appendTo(tr);
                $("<td>").text("").appendTo(tr);
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
});
