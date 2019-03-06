var _passportHelper;
var _claimTypes;
var _claimTemplate;
var _explorerUrl;

$(function () {
    Init();
});

async function Init() {
    var settings = await getSettings();
    _explorerUrl = settings.explorerBaseUrl;
    initUI();
}

async function initUI() {
    $("#back_button").click(function () {
        loadPage("passportdetails");
    });

    $("#create_verification_request_button").click(function(){
        loadPage("createverification");
    });

    _claimTemplate = $(".claim-template").first();

    var claims = await getPassportClaims();
    if (!claims || claims.length == 0) {
        $("#no_claims_message").show();
    }
    else {
        for (let i = 0; i < claims.length; i++) {
            claims[i].signedById = await getPassportIdForPublicKey(claims[i].signedByKey);
            $("#claims_list").append(getClaimItem(claims[i]));
        }

        $("#claims_list").show();
    }
    hideWait();
}

function getClaimItem(claim) {
    var claimItem = $(_claimTemplate).clone();
    $(claimItem).find(".claim-name").html("<b>" + claim.claimTypeName + ":</b> " + claim.claimValue);

    let expiresOn;
    if(!claim.expiresOn || claim.expiresOn == 0) //Does not expire
    {
        expiresOn = "None";
    }
    else if(claim.expiresOn > 0){
        expiresOn = new Date(claim.expiresOn * 1000).toLocaleDateString();
    }

    $(claimItem).find(".claim-expires").text("Expires On: " + expiresOn);
    $(claimItem).find(".claim-signature-link").text(claim.signedById);
    $(claimItem).find(".partner-details-link").attr("data-passportid",claim.signedById);
    return claimItem;
}