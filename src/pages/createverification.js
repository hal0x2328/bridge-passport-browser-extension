var _partners;
var _fee;
var _partner;

$(function () {
    Init();
});

async function Init() {

    if (!await checkBridgeOnline()) {
        alert("Error communicating with Bridge.  Please check your connection.");
        loadPage("passportdetails");
        return;
    }

    _partners = await getVerificationPartners();
    _fee = await getNetworkFee();

    if (!_fee) {
        alert("Error getting network fees.  Please check your connection.");
        loadPage("passportdetails");
        return;
    }

    initUI();
    hideWait();
}

async function initUI() {
    for (let i = 0; i < _partners.length; i++) {
        $("#verification_partner_select").find(".menu").append("<div class='item' data-value='" + _partners[i].id + "'>" + _partners[i].name + " (" + _partners[i].id + ")</div>");
    }

    $("#verification_partner_select").change(function () {
        $("#verification_partner_select_label").hide();
        $("#verification_fee").text(_fee);

        _partner = getPartnerById($("#verification_partner").val());

        for (let i = 0; i < _partner.verificationServices.length; i++) {
            $("#verification_services").append("<li>" + makeStringReadable(_partner.verificationServices[i]) + "</li>");
        }
        $("#verification_services_container").show();
    });

    $("#verification_info_link").click(function () {
        window.open(_partner.infoUrl);
    });

    $("#create_button").click(function () {
        createVerificationRequest();
    });

    $("#cancel_button").click(function () {
        loadPage("passportverifications");
    });

    $('.ui.dropdown').dropdown();
}

function getPartnerById(partnerId) {
    var partner;
    for (let i = 0; i < _partners.length; i++) {
        if (_partners[i].id == partnerId) {
            partner = _partners[i];
        }
    }

    return partner;
}

async function createVerificationRequest() {
    let partnerId = $("#verification_partner").val();
    if (!partnerId) {
        alert('You must select a partner to send the request to.');
        return;
    }

    let addresses = await getBlockchainAddresses();
    let address = addresses[0];

    showWait("Checking balance...");
    let balance = 0;
    let info = await getBlockchainAddressInfo(address.network, address.address);

    if (!info || !info.successful) {
        alert("Could not get blockchain address information for payment.  Please make sure you register your blockchain address before attempting to purchase services on the network.");
        hideWait();
        return;
    }

    if (info.balance != null) {
        balance = info.balance;
    }

    if (balance < _fee) {
        alert("Insufficient balance to pay network fees, cost: " + _fee);
        hideWait();
        return;
    }

    showWait("Creating request on Bridge Protocol Network...");
    let application = await createApplication(partnerId);
    if (!application) {
        alert("Could not create verification request.");
        hideWait();
        return;
    }

    await sendPayment(application, address);
}

async function sendPayment(application, address) {
    var applicationId = application.id;

    //Send the transaction
    showWait("Sending fee payment transaction...");
    setTimeout(async function () {
        let transactionId;
        if (_fee > 0) {
            transactionId = await sendBlockchainPayment(address.network, _fee, applicationId);
            if (!transactionId) {
                alert("Error sending payment transaction to " + address.network);
                hideWait();
                return;
            }

            //Update the network transaction Id
            let application = await updateApplicationTransaction(applicationId, address.network, transactionId);
            if (!application) {
                alert("Error updating application transaction");
                hideWait();
                return;
            }
        }

        showWait("Waiting for payment verification...");
        checkApplicationPaymentStatus(applicationId, async function (application) {
            if (application.status != "paymentReceived") {
                alert("Payment not received.  The verification request is on the network but cannot be transmitted to the third party verifier until the payment transaction is successful.  Please retry the payment later from the Verification Request details page.");
                loadPage("verificationdetails", applicationId);
                return;
            }

            setTimeout(async function () {
                //Transmit
                showWait("Transmitting request to verification partner...");
                var application = await resendApplication(applicationId);
                if (!application || application.status != "receivedByPartner") {
                    alert("The verification request was created successfully on the network, but the Bridge Protocol Verification Partner did not successfully accept the request.  Please retry the transmission later from the Verification Request details page.");
                }
                else if (application.url) {
                    window.open(application.url);
                }

                loadPage("passportverifications");
            }, 1000);
        });
    }, 50);
}