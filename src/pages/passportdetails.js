var _passport;
var _settings;

$(function () {
    Init();
});

async function Init(){
    var params = getParamsFromLocation();

    if(await checkPassportLogin()){
        return;
    }
    _passport = await getPassport();

    await initUI();
}

async function initUI() {
    $("#passport_id").val(_passport.id);

    $("#view_claims_button").click(function () {
        loadPage("passportclaims");
    });

    $("#view_verifications_button").click(function () {
        loadPage("passportverifications");
    });

    $("#view_blockchain_button").click(function () {
        loadPage("blockchainaddresses");
    })

    $("#copy_passport_id").popup({ on: 'click' });
    $("#copy_passport_id").click(function () {
        try {
            $("#passport_id").prop("disabled", false);
            $("#passport_id").select();
            document.execCommand('copy');
            $("#passport_id").prop("disabled", true);
            window.getSelection().removeAllRanges();
        }
        catch (err) {

        }
    });

    $("#copy_public_key").popup({ on: 'click' });
    $("#copy_public_key").click(function () {
        try {
            $("#public_key").prop("disabled", false);
            $("#public_key").select();
            document.execCommand('copy');
            $("#public_key").prop("disabled", true);
            window.getSelection().removeAllRanges();
        }
        catch (err) {

        }
    });

    $("#view_settings_button").click(async function () {
        _settings = await getSettings();
        $("#lock_passport").prop('checked', _settings.lockPassport);
        $("#api_url").val(_settings.apiBaseUrl);
        $("#explorer_url").val(_settings.explorerBaseUrl);

        $('#settings_modal').modal('show');
    });

    $("#advanced_settings_button").click(function () {
        $("#advanced_settings_button_container").hide();
        $("#advanced_settings_container").transition("slide down");

        $("#clear_cache_button").click(async function () {
            await clearCache();
            alert("Cache(s) Cleared");
        });
    });

    $("#ok_button").click(async function () {
        _settings.lockPassport = $("#lock_passport").is(':checked');
        _settings.apiBaseUrl = $("#api_url").val();
        _settings.explorerBaseUrl = $("#explorer_url").val();
        await saveSettings(_settings);
    });

    $("#export_button").click(function () {
        exportPassport(_passport);
    });

    $("#unload_button").click(async function () {
        await removePassport();
        loadPage("createpassport");
    });

    $("#close_button").click(async function () {
        await closePassport();
        window.close();
    });

    $("#passport_details").show();

    hideWait();
}