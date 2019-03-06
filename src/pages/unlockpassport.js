$(function () {
    Init();
});

async function Init() {
    var passport = await getPassportFromStorage();
    if (!passport) {
        loadPage("createpassport", null, true);
        return;
    }
    else {
        //How did we get here?  We shouldn't be here if we have a passport in storage and a passphrase checked by popup.js
    }

    hideWait();

    $("#unlock_passport_button").click(async function () {
        var passphrase = $("#unlock_passphrase").val();
        if (!passphrase) {
            alert("Passphrase is required.");
            return;
        }

        showWait("Unlocking Bridge Passport...");
        setTimeout(async function () {
            try {
                var passport = await unlockPassport(passphrase);
                if (passport) {
                    loadPage("passportdetails", null, true);
                }
                else {
                    $("#error").text("Invalid passphrase.");
                    hideWait();
                }
            }
            catch (err) {
                alert("Could not unlock passport: " + err);
                hideWait();
            }
        }, 50);
    });
}

