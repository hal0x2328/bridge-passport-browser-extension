var _request;

$(function () {
    Init();
});

async function Init(){
    var login = await getPassportLogin();
    _request = await getPassportLoginRequest(login);
    initUI();
    hideWait();
}

function initUI() {
    var publicClaimTypes = new Array();
    var privateClaimTypes = new Array();

    for (let i = 0; i < _request.claimTypes.length; i++) {
        if (_request.claimTypes[i].id < 1000) {
            privateClaimTypes.push(_request.claimTypes[i]);
        }
        else {
            publicClaimTypes.push(_request.claimTypes[i]);
        }
    }

    if (privateClaimTypes.length > 0 || publicClaimTypes.length > 0) {
        $("#login_no_claims_container").hide();
        if (privateClaimTypes.length > 0) {
            $("#login_private_claims_container").show();
            for (let i = 0; i < privateClaimTypes.length; i++) {
                if (checkMissingClaimType(privateClaimTypes[i].id)) {
                    $("#login_private_claims_list").append("<div class='error'>" + privateClaimTypes[i].name + "</div>");
                }
                else {
                    $("#login_private_claims_list").append("<div><input id='" + privateClaimTypes[i].id + "' type='checkbox' checked /> " + privateClaimTypes[i].name + "</div>");
                }
            }
        }
        if (publicClaimTypes.length > 0) {
            $("#login_public_claims_container").show();
            for (let i = 0; i < publicClaimTypes.length; i++) {
                if (checkMissingClaimType(publicClaimTypes[i].id)) {
                    $("#login_public_claims_list").append("<div class='error'>" + publicClaimTypes[i].name + "</div>");
                }
                else {
                    $("#login_public_claims_list").append("<div><input id='" + publicClaimTypes[i].id + "' type='checkbox' checked disabled /> " + publicClaimTypes[i].name + "</div>");
                }
            }
        }
    }

    //Check to see if it's a known network partner, warn the user if not
    if (_request.passportDetails && _request.passportDetails.isNetworkPartner) {
        $("#login_known_site").show();
        $("#login_unknown_site").hide();
        $("#login_known_id").html("<b>Id:</b> " + _request.passportDetails.id);
        $("#login_known_name").html("<b>Name:</b> " + _request.passportDetails.partnerName);

        if (_request.passportDetails.partnerAddresses && _request.passportDetails.partnerAddresses.length == 1) {
            $("#login_known_locations").html("<b>Location:</b> " + _request.passportDetails.partnerAddresses[0]);
        }
        else if (_request.passportDetails.partnerAddresses) {
            let partnerAddresses = "<div><b>Locations:</b></div>";
            for (let i = 0; i < _request.passportDetails.partnerAddresses.length; i++) {
                partnerAddresses += "<li>" + _request.passportDetails.partnerAddresses[i] + "</li>";
            }
            $("#login_known_locations").html(partnerAddresses);
        }
    }
    
    //Warn the user if the signature on the message / token is not valid
    if (!_request.payload.token) {
        $("#login_invalid_signature").show();
    }

    $("#view_details_button").click(function () {
        loadPage("windowhandler", null, true);
    });

    $("#login_button").click(async function () {
        showWait("Sending passport information...");
        setTimeout(async function () {
            let claimTypeIds = new Array();
            $("input[type=checkbox]").each(function () {
                if ($(this).prop("checked")) {
                    claimTypeIds.push($(this).attr("id"));
                }
            });

            var response = await getPassportLoginResponse(_request, claimTypeIds);
            await sendPassportLogin(response.passportId, response.payload);
            window.close();
        }, 50);
    });

    $("#content").show();
}

function checkMissingClaimType(claimTypeId) {
    for (let i = 0; i < _request.missingClaimTypes.length; i++) {
        if (_request.missingClaimTypes[i].id == claimTypeId) {
            return true;
        }
    }
    return false;
}