function sendBackgroundMessage(message, callback) {
  chrome.runtime.sendMessage(message, callback);
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  let res = null;
  if (request.action == 'getBridgeLoginRequest') {
    if($('#bridge_passport_login').length){
      res = $('#bridge_protocol_passport_login_request').val();
    }
  }
  
  if(request.action == 'sendBridgeLoginResponse'){
    $('#bridge_protocol_passport_login_response').val(request.responseValue).trigger('change');
    $('#bridge_protocol_passport_login_passport_id').val(request.passportId).trigger('change');
    $('#bridge_passport_login_form').attr('onsubmit', '');
    $('#bridge_passport_login_form').submit();
  }

  if(request.action == 'getBridgePaymentRequest'){
    if($('#bridge_passport_payment').length)
    {
      var paymentIdentifier = $('#bridge_passport_payment_identifier').val();
      var paymentAmount = $('#bridge_passport_payment_amount').val();
      var paymentAddress = $('#bridge_passport_payment_address').val();
      res = JSON.stringify({ paymentIdentifier, paymentAmount, paymentAddress });
    }
  }

  if(request.action == 'sendBridgePaymentResponse'){
    $('#bridge_passport_payment_transaction_id').val(request.transactionId).trigger('change');
    $('#bridge_passport_payment_form').attr('onsubmit', '');
    $('#bridge_passport_payment_form').submit();
  }
  
  sendResponse(res);
});