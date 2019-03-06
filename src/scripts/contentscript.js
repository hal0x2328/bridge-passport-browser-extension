function sendBackgroundMessage(message, callback) {
  chrome.runtime.sendMessage(message, callback);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  let res = null;
  if (request.action == 'getBridgeLoginRequest') {
    var loginRequest = $('#bridge_protocol_passport_login_request').val();
    if(loginRequest != null){
      res = loginRequest;
    }
  }
  else if(request.action == 'sendBridgeLoginResponse'){
    $('#bridge_protocol_passport_login_response').val(request.responseValue).trigger('change');
    $('#bridge_protocol_passport_login_passport_id').val(request.passportId).trigger('change');
    $('#bridge_passport_login_form').attr('onsubmit', '');
    $("#bridge_passport_login_form").submit();
  }
  sendResponse(res);
});