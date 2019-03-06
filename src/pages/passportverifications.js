var _applicationTemplate;

$(function () {
    Init();
});

async function Init(){
    _applicationTemplate = $(".application-template").first();

    if(!await checkBridgeOnline()){
        alert("Error communicating with Bridge.  Please check your connection.");
        loadPage("passportdetails");
        return;
    }

    var applications = [];
    try{
       applications = await getApplications();
    }
    catch(err){
        alert("Error retrieving verification requests from Bridge.  Please check your connection.");
        loadPage("passportdetails");
        return;
    }

    initUI(applications);
}

function initUI(applications){

    $("#back_button, #cancel_button").click(function(){
        loadPage("passportdetails");
    });

    $("#create_verification_request_button").click(function(){
        loadPage("createverification");
    });

    $("#verification_request_list").show();
    hideWait();
    
    if (applications) {
        if(applications && applications.length > 0){
            $("#verification_request_list").empty();
        }
        for (let i = 0; i < applications.length; i++) {
            var item = getApplicationItem(applications[i]);
            $("#verification_request_list").append(item);
        }
    }

    $(".verification_request_link").click(function(){
        let id = $(this).attr('id');
        loadPage("verificationdetails", id);
    })
}

function getApplicationItem(application)
{
    var applicationItem = $(_applicationTemplate).clone();
    var link = $(applicationItem).find(".application-link");
    link.click(function(){
        loadPage("verificationdetails", application.id);
    })

    $(applicationItem).find(".application-name").text(application.id);
    $(applicationItem).find(".application-partner").text("Partner: " + application.verificationPartnerName);
    var createdDate = new Date(application.createdOn * 1000);
    var created = createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString();
    $(applicationItem).find(".application-detail").text("Created: " + created);
    return applicationItem;
}