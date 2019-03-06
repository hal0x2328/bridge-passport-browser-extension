$(function () {
    Init();
});

async function Init(){
    if(await checkPassportLogin()){
        return;
    }

    loadPage("passportdetails", null, true);
}