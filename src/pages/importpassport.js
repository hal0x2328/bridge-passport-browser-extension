var _passportContent;

$(function () {
    $("#create_passport_link").click(function () {
        loadPage("createpassport");
    });

    $("#import_passport_button").click(function () {
        if (!_passportContent) {
            alert("A valid passport file is required.");
            return;
        }
        var passphrase = $("#import_passphrase").val();
        if (!passphrase) {
            alert("Passphrase is required.");
            return;
        }

        showWait("Opening Bridge Passport...");
        setTimeout(async function () {
            try {
                var passport = await importPassport(_passportContent, passphrase);
                if (passport) {
                    loadPage("main");
                }
                else {
                    $("#error").text("Invalid passphrase.");
                    hideWait();
                }
            }
            catch (err) {
                alert("Could not load passport: " + err);
                hideWait();
            }
        }, 50);
    });

    $('#import_file').change(async function () {
        var reader = new FileReader();
        reader.addEventListener("loadend", async function () {
            if (reader.result) {
                _passportContent = reader.result;
                console.log("Loaded passport from file.");
            }
        });
        reader.readAsText(this.files[0]);
    });

    hideWait();
});