chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  let res = null;
  alert("request!");
  if(request.action == 'sendBridgeLoginResponse'){
    $('#bridge_protocol_passport_login_response').val(request.responseValue).trigger('change');
    $('#bridge_protocol_passport_login_passport_id').val(request.passportId).trigger('change');
    $('#bridge_passport_login_form').attr('onsubmit', '');
    $('#bridge_passport_login_form').submit();
  }

  if(request.action == 'sendBridgePaymentResponse'){
    $('#bridge_passport_payment_transaction_id').val(request.transactionId).trigger('change');
    $('#bridge_passport_payment_form').attr('onsubmit', '');
    $('#bridge_passport_payment_form').submit();
  }
  
  sendResponse(res);
});

document.addEventListener("bridge-protocol-login-request", function(data) {
  if(!data.detail.loginRequest)
  {
    alert("loginRequest was not provided");
    return;
  }
  console.log('Bridge Protocol Content Script: Login request received: ' + JSON.stringify(data.detail));
  chrome.runtime.sendMessage({ target: "background", action: "login", detail: data.detail });
});

document.addEventListener("bridge-protocol-payment-request", function(data) {
  if(!data.detail.paymentIdentifier){
    alert("paymentIdentifier was not provided");
    return;
  }
  if(!data.detail.paymentAmount){
    alert("paymentAmount was not provided");
    return;
  }
  if(!data.detail.paymentAddress){
    alert("paymentAddress was not provided");
    return;
  }

  console.log('Bridge Protocol Content Script: Payment request received: ' + JSON.stringify(data.detail));
  chrome.runtime.sendMessage({ target: "background", action: "payment", detail: data.detail });
});

