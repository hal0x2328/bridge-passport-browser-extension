$(function () {
    Init();
});

async function Init(){
    if(await checkPassportLogin()){
        return;
    }
    if(await checkPassportPayment()){
        return;
    };

    loadPage("passportdetails", null, true);
}