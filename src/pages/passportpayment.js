let _request;

$(function () {
    Init();
});

async function Init() {
    _request = await getPassportPayment();
    _request = JSON.parse(_request);
    
    initUI();
    hideWait();
}

async function initUI() {
    $("#payment_address").text(_request.paymentAddress);
    $("#payment_amount").text(_request.paymentAmount);

    $("#content").show();
    $("#view_details_button").click(function () {
        loadPage("windowhandler", null, true);
    });

    $("#payment_button").click(async function () {
        showWait("Checking balance...");
        let addresses = await getBlockchainAddresses();
        let address = addresses[0];
        let info = await getBlockchainAddressInfo(address.network, address.address);

        if (!info || !info.registered) {
            alert("Could not get blockchain address information for payment.  Please make sure you register your blockchain address before attempting to purchase services on the network.");
            hideWait();
            return;
        }

        if (info.balance != null) {
            balance = info.balance;
        }

        let amount = parseInt(_request.paymentAmount);
        if (balance < amount) {
            alert("Insufficient balance to pay network fees, cost: " + amount);
            hideWait();
            return;
        }

        //Send the transaction
        showWait("Sending fee payment transaction...");
        setTimeout(async function () {
            let transactionId;
            transactionId = await sendBlockchainPayment(address.network, amount, _request.paymentIdentifier, _request.paymentAddress);
            if (!transactionId) {
                alert("Error sending payment transaction to " + address.network);
                hideWait();
                return;
            }

            await sendPassportPayment(transactionId);
            window.close();
        }, 50);
    });
}
