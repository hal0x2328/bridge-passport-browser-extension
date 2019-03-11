var _blockchainTemplate;
$(function () {
    Init();
});

async function Init() {
    _blockchainTemplate = $(".blockchain-template").first();
    var addresses = await getBlockchainAddresses();

    await initUI(addresses);
}

async function initUI(addresses) {
    let bridgeOnline = true;

    if (addresses) {
        if (addresses && addresses.length > 0) {
            $("#blockchain_list").empty();
        }
        

        for (let i = 0; i < addresses.length; i++) {
            var info = await getBlockchainAddressInfo(addresses[i].network, addresses[i].address);

            addresses[i].registered = false;
            if(!info)
            {
                bridgeOnline = false;
                alert("Unable to get blockchain information from Bridge.  Some features may be unavailable offline.");
            }

            if (info && info.balance != null) {
                addresses[i].balance = info.balance;
            }

            if (info && info.registered) {
                addresses[i].registered = true;
            }

            var item = getBlockchainItem(addresses[i]);
            $("#blockchain_list").append(item);
            if (i == addresses.length - 1) {
                hideWait();
            }
        }
    }

    $("#back_button").click(function () {
        loadPage("passportdetails");
    });

    $("#copy_wif").popup({ on: 'click' });
    $("#copy_wif").click(function () {
        try {
            $("#wif_value").prop("disabled", false);
            $("#wif_value").select();
            document.execCommand('copy');
            $("#wif_value").prop("disabled", true);
            window.getSelection().removeAllRanges();
            alert('Private Key Copied to Clipboard');
        }
        catch (err) {
            
        }
    });

    if(!bridgeOnline){
        $("#blockchain-balance").text("Unavailable Offline");
        $("#blockchain-registered").text("Unavailable Offline");
    }
}

function getBlockchainItem(address) {
    var item = $(_blockchainTemplate).clone();
    $(item).find(".blockchain-network").html(address.network);
    $(item).find(".blockchain-address").html(address.address);
    $(item).find(".blockchain-balance").html(address.balance);
    $(item).find(".view-key").click(function () {
        showWait("Getting Private Key...");
        setTimeout(async function () {
            var key = await getBlockchainPrivateKey(address.network, address.key);
            if (address.network == "NEO") {
                $("#key_modal_text").text("Private Key (WIF)");
            }
            $("#wif_value").val(key);
            $('#key_modal').modal('show');
            hideWait();
        }, 50);
    });

    if (address.registered) {
        $(item).find(".blockchain-registered").html("Yes");
    }
    else {
        $(item).find(".blockchain-register").click(function () {
            showWait("Registering passport and address on blockchain...<br>(This may take a few minutes depending on the network)", true);
            setTimeout(async function () {
                var transactionId = await registerBlockchainAddress(address.network, address.address);
                if (!transactionId) {
                    alert("Error sending transaction to " + address.network);
                    hideWait();
                    return;
                }

                checkTransactionComplete(address.network, transactionId, async function () {
                    var info = await getBlockchainTransactionInfo(address.network, transactionId);
                    if (info.successful) {
                        loadPage("blockchainaddresses");
                    }
                    else {
                        alert("Could not register on " + address.network + ": " + info.messages[0]);
                    }

                    hideWait();
                });
            }, 50);
        });
    }

    return item;
}
