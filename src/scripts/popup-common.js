//UI
document.title = 'Bridge Passport';

function showWait(message, twoLine) {
	if (twoLine) {
		$("#loading_spinner").find("img").css("margin-top", "28px");
		$("#loading_spinner_message").css("padding-top", "10px");
	}
	else {
		$("#loading_spinner").find("img").css("margin-top", "0px");
		$("#loading_spinner_message").css("padding-top", "0px");
	}

	$("#loading_spinner_message").html(message);
	$("#loading_spinner").show();
}

function hideWait() {
	window.setTimeout(hideSpinner, 200);
}

function hideSpinner() {
	$("#loading_spinner_message").text("&nbsp;");
	$("#loading_spinner").hide();
}

function makeStringReadable(str) {
	let camelMatch = /([A-Z])/g;
	str = str.replace(camelMatch, " $1");

	//Make sure we're upper case
	str = str.charAt(0).toUpperCase() + str.slice(1);

	return str;
}

window.addEventListener('focus', function () {
	var img = _browser.extension.getURL("/images/shared/background.png");
	$('body').css("background-image", '');
	$('body').css("background-image", img);
});


//Utility
async function loadPage(pageName, params, popup) {
	var target = "./" + pageName + ".html";
	if (params) {
		target = target + "?params=" + params;
	}

	if (popup) {
		var url = _browser.extension.getURL("/pages/" + pageName + ".html");
		if (params) {
			url = url + "?params=" + params;
		}

		var height = 520;
		var width = 515;
		var windowSize = {
			height,
			width,
			left: window.screenX,
			top: window.screenY
		};

		window.close();
		var res = await _browser.runtime.sendMessage({ target: 'background', action: 'openPopup', url, windowSize });
	}
	else {
		location.href = target;
	}
}

function getParamsFromLocation() {
	var target = String(window.location);
	var idx = target.lastIndexOf("params=");
	if (idx == -1)
		return null;

	return target.substring(idx + 7, target.length);
}

async function checkPassportLogin() {
	var login = null;

	try {
		login = await getPassportLogin();
	}
	catch (err) {

	}

	if (login) {
		loadPage("loginpassport");
		return true;
	}

	return false;
}

function exportPassport(passport) {
	var iframe = Object.assign(document.createElement('iframe'), {
		onload() {
			var doc = this.contentDocument;
			var a = Object.assign(doc.createElement('a'), {
				href: 'data:text/plain;base64,' + btoa(JSON.stringify(passport)),
				download: 'passport.json',
			});
			doc.body.appendChild(a);
			a.dispatchEvent(new MouseEvent('click'));
			setTimeout(() => this.remove());
		},
		style: 'display: none',
	});
	document.body.appendChild(iframe);
}

async function checkBridgeOnline(){
	var bridgePassportId = await getBridgePassportId();
	
	if(bridgePassportId){
		return true;
	}

	return false;
}

async function checkTransactionComplete(network, transactionId, callback) {
	setTimeout(async function () {
		var res = await checkBlockchainTransactionComplete(network, transactionId);
		if(!res){
			checkTransactionComplete(network, transactionId, callback);
		}
		else{
			callback();
		}
	}, 15000);
}

async function checkApplicationPaymentStatus(applicationId, callback){
	setTimeout(async function () {
		let application = await getApplication(applicationId);
		if(application.status == "waitingForPayment"){
			checkApplicationPaymentStatus(applicationId, callback);
		}
		else{
			callback(application);
		}
	}, 15000);
}

//Background script messaging helpers
async function getBridgePassportId(){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBridgePassportId' });
}

async function getPassphrase(callback) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassphrase' });
}

async function getPassportFromStorage(callback) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportFromStorage' });
}

async function createPassport(passphrase) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'createPassport', passphrase });
}

async function getPassportDetails() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportDetails' });
}

async function getPassportIdForPublicKey(publicKey) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportIdForPublicKey', publicKey });
}

async function importPassport(content, passphrase) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'importPassport', content, passphrase });
}

async function unlockPassport(passphrase) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'unlockPassport', passphrase });
}

async function getPassport() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassport' });
}

async function closePassport() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'closePassport' });
}

async function removePassport(callback) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'removePassport' });
}

async function getPassportClaims() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getClaims' });
}

async function getApplications(callback) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getApplications' });
}

async function getApplication(applicationId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getApplication', applicationId });
}

async function createApplication(partner) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'createApplication', partner });
}

async function updateApplicationTransaction(applicationId, network, transactionId){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'updateApplicationTransaction', applicationId, network, transactionId });
}

async function resendApplication(applicationId){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'resendApplication', applicationId });
}

async function clearCache() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'clearCache' });
}

async function getSettings() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getSettings' });
}

async function saveSettings(settings) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'saveSettings', settings });
}

async function getVerificationPartners() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getVerificationPartners' });
}

async function getPassportLogin() {
	var tabs = await _browser.tabs.query({ active: true, currentWindow: true });
	let message = {
		action: 'getBridgeLoginRequest'
	};

	return await _browser.tabs.sendMessage(tabs[0].id, message);
}

async function sendPassportLogin(passportId, responseValue) {
	var tabs = await _browser.tabs.query({ active: true, currentWindow: true });
	let message = {
		action: 'sendBridgeLoginResponse',
		passportId,
		responseValue
	};

	return await _browser.tabs.sendMessage(tabs[0].id, message);
}

async function getPassportLoginRequest(payload) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportLoginRequest', payload });
}

async function getPassportLoginResponse(request, claimTypeIds) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportLoginResponse', request, claimTypeIds });
}

async function removeAllApplicationClaims(applicationId, callback) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'removeAllApplicationClaims', applicationId });
}

async function updateClaimPackages(claimPackages, callback) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'updateClaimPackages', claimPackages });
}

async function getNetworkFee(){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getNetworkFee' });
}

async function getBlockchainAddresses() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainAddresses' });
}

async function getBlockchainPrivateKey(network, key) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainPrivateKey', network, key });
}

async function registerBlockchainAddress(network, address) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'registerBlockchainAddress', network, address });
}

async function sendBlockchainPayment(network, amount, paymentIdentifier) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'sendBlockchainPayment', network, amount, paymentIdentifier});
}

async function getBlockchainPassportInfo(network, passportId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainPassportInfo', network, passportId });
}

async function getBlockchainAddressInfo(network, address) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainAddressInfo', network, address });
}

async function getBlockchainTransactionInfo(network, transactionId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainTransactionInfo', network, transactionId });
}

async function checkBlockchainTransactionComplete(network, transactionId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'checkBlockchainTransactionComplete', network, transactionId });
}