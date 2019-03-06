$(function () {
	Init();
});

async function Init(){
	var passport = await getPassport();
	if (passport) {
		//We have an unlocked passport cached, we have everything in memory we need, just proceed
		loadPage("/pages/windowhandler");
	}
	else {
		//Otherwise we need to figure out if we just need to unlock with passphrase
		//Or if the user has never imported / created
		loadPage("/pages/unlockpassport");
	}
}