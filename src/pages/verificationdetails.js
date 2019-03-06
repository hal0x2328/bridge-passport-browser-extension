var _claimTemplate;
var _application;

$(function () {
    Init();
});

async function Init() {
    _claimTemplate = $(".claim-template").first();
    var id = getParamsFromLocation();
    _application = await getApplication(id);
    if (_application) {
        $("#id").val(_application.id);
        $("#status").val(makeStringReadable(_application.status));
        if (_application.status == "paymentReceived") 
        {
            $("#partner_retry_send_container").show();
        }
        else if(_application.status == "receivedByPartner")
        {
            $("#partner_direct_link_container").show();
        }

        $("#verification_partner").val(_application.verificationPartnerName);
        let createdOn = new Date(_application.createdOn * 1000);
        let updatedOn = new Date(_application.updatedOn * 1000);
        $("#last_updated").val(updatedOn.toLocaleDateString() + " " + updatedOn.toLocaleTimeString());
        $("#created_on").val(createdOn.toLocaleDateString() + " " + createdOn.toLocaleTimeString());
        $("#url").val(_application.url);
        $("#payment_network").val(_application.transactionNetwork);
        $("#payment_transaction").val(_application.transactionId);

        if (_application.decryptedClaims && _application.decryptedClaims.length > 0) {
            $("#claims_container").show();
            $("#claims_list").empty();
            $("#remove_button").click(function () {
                removeClaims();
            });

            $("#import_button").click(function () {
                importClaims();
            });

            for (let i = 0; i < _application.decryptedClaims.length; i++) {
                var item = getClaimItem(_application.decryptedClaims[i]);
                $("#claims_list").append(item);
            }
        }

        if(_application.claims && _application.decryptedClaims && _application.decryptedClaims.length < _application.claims.length){
            alert("Some claims associated with this application could not be decrypted.  They may be invalid or an incompatible format.");
        }
    }

    $("#back_button").click(function () {
        loadPage("passportverifications");
    });

    $("#partner_retry_send").click(async function () {
        showWait("Retrying transmission to partner...");
        setTimeout(async function () {
            var application = await resendApplication(_application.id);
            if (!application || application.status == "notTransmittedToPartner") {
                alert("Transmission to partner failed.  The partner may be offline.  Please try again later.");
                hideWait();
            }
            else if (application.url) {
                window.open(application.url);
                window.close();
            }
            else{
                location.reload();
            }   
        }, 50);
    });

    $("#partner_site_button").click(function () {
        window.open(_application.url);
    });

    $("#copy_id").popup({ on: 'click' });
    $("#copy_id").click(function () {
        try {
            $("#id").prop("disabled", false);
            $("#id").select();
            document.execCommand('copy');
            $("#id").prop("disabled", true);
            $("#partner_site_button").focus();
        }
        catch (err) {

        }
    });

    $("#copy_url").popup({ on: 'click' });
    $("#copy_url").click(function () {
        try {
            $("#url").prop("disabled", false);
            $("#url").select();
            document.execCommand('copy');
            $("#url").prop("disabled", true);
            $("#partner_site_button").focus();
        }
        catch (err) {

        }
    });

    $('.ui.checkbox').checkbox();
    hideWait();
}


async function importClaims() {
    let claimPackages = new Array();
    let count = 0;
    $("input[type=checkbox]").each(function () {
        let isChecked = $(this).prop("checked");
        if(isChecked){
            let claim = _application.claims[count];
            if(claim){
                claimPackages.push(claim);
            }  
        }
        count++;
    });

    var r = confirm("Are you sure you want to update your passport with the selected claims?  Any existing claims of the same type will be replaced.");
    if (r) {
        showWait("Updating passport claim packages...");
        $(window).scrollTop(0);
        setTimeout(async function () {
            try {
                await updateClaimPackages(claimPackages);
                loadPage("passportclaims");
            }
            catch (err) {
                alert("Could not update passport claim packages: " + err);
                hideWait();
            }
        }, 50);
    }
}

async function removeClaims() {
    var r = confirm("Are you sure you want to remove the claims from this verification request?  This cannot be undone.");
    if (r) {
        try {
            await removeAllApplicationClaims(_application.id);
            loadPage("verificationdetails", _application.id);
        }
        catch (err) {
            alert("Unable to remove claims from verification request: " + err.message);
        }
    }
}

function getClaimItem(claim) {
    var claimItem = $(_claimTemplate).clone();
    let expiresOn = new Date(claim.expiresOn * 1000);
    var checkBox = $(claimItem).find("input[type=checkbox]");
    checkBox.attr('id', claim.claimTypeId);
    $(claimItem).find(".claim-name").text(" (" + claim.claimTypeId + ") " + claim.claimTypeName + ": " + claim.claimValue);
    $(claimItem).find(".claim-detail").text("Expires on: " + expiresOn.toLocaleDateString());
    return claimItem;
}