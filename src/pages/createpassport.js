var _params;

$(function () {
    _params = getQueryStringFromLocation();

    $("#create_passport_link").click(function () {
        $("#create_passport_container").show();
        $("#import_passport_container").hide();
    });

    $("#import_passport_link").click(function () {
        loadPage("importpassport", _params);
    });

    $("#create_passport_button").click(async function () {
        var passphrase = $("#create_passphrase").val();
        var verifyPassphrase = $("#verify_passphrase").val();
        if (!passphrase) {
            alert("Passphrase is required.");
            return;
        }
        if(!verifyPassphrase){
            alert("Please verify your passphrase.");
            return;
        }
        if(passphrase != verifyPassphrase){
            alert("Passphrase and verification do not match.");
            return;
        }

        showWait("Creating Bridge Passport...");
        setTimeout(async function () {
            try {
                var passport = await createPassport(passphrase, $("#neo_wif").val(), true);
                if (passport) {
                    loadPage("main", _params);
                }
                else {
                    alert("Could not create passport");
                }
            }
            catch (err) {
                alert("Could not create passport: " + JSON.stringify(err));
            }
        }, 50);
    });

    $("#view_settings_button").click(async function () {
        _settings = await getSettings();
        $("#lock_passport").prop('checked', _settings.lockPassport);
        $("#api_url").val(_settings.apiBaseUrl);
        $("#explorer_url").val(_settings.explorerBaseUrl);
        $('#settings_modal').modal('show');
    });

    $("#clear_cache_button").click(async function () {
        await clearCache();
        alert("Cache(s) Cleared");
    });

    $("#ok_button").click(async function () {
        _settings.lockPassport = $("#lock_passport").is(':checked');
        _settings.apiBaseUrl = $("#api_url").val();
        _settings.explorerBaseUrl = $("#explorer_url").val();
        await saveSettings(_settings);
    });

    $('.ui.accordion').accordion();
    hideWait();
});

