import React from "react";

const SmsOrder = ({
  productsToSend = [],
  deliveryChargeAmount = 0,
  parsedDiscount = 0,
  customerPhone = "",
  customerAddress = "",
  restaurantName = "",
  totalCustomerCredit,
  gstAmount,
  ComissionAmount,
}) => {
  const buildBody = () => {
    const lines = [];
    if (restaurantName) lines.push(restaurantName);
    lines.push("Order Details:");
    productsToSend.forEach((p) => {
      const qty = p.quantity || 1;
      const qtyType = p.quantityType || "kg";
      const quantity = `${qty} ${qtyType}`;
      lines.push(`${p.name} - ${p.price} x ${quantity} = ₹${(p.price * qty).toFixed(1)}`);
    });
    if (deliveryChargeAmount) {
      lines.push(`Delivery: ₹${deliveryChargeAmount.toFixed(1)}`);
    }
    if (parsedDiscount) {
      lines.push(`Discount: -₹${parsedDiscount.toFixed(1)}`);
    }
    if (gstAmount) {
      lines.push(`APMC: (2%) ₹${gstAmount.toFixed(1)}`)
    }
    if (ComissionAmount) {
      lines.push(`APMC: (5%) ₹${ComissionAmount.toFixed(1)}`)
    }
    const total =
      productsToSend.reduce(
        (sum, p) => sum + p.price * (p.quantity || 1),
        0
      ) +
      deliveryChargeAmount +  gstAmount + ComissionAmount -
      parsedDiscount;
    lines.push(`Total: ₹${total.toFixed(1)}`);
    if(totalCustomerCredit) {
      lines.push(`Balance: ₹${totalCustomerCredit}`);
    }
    if (customerAddress) {
      lines.push(`Address: ${customerAddress}`);
    }
    return encodeURIComponent(lines.join("\n"));
  };

  const handleSendSMS = () => {
    if (!customerPhone) return alert("Customer phone number is missing.");
    const smsURI = `sms:${customerPhone}?body=${buildBody()}`;

    // Create an invisible anchor to trigger the link
    const tempLink = document.createElement("a");
    tempLink.href = smsURI;
    tempLink.style.display = "none";
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
  };

  return (
    <button type="button" className="popupButton" onClick={handleSendSMS}>
      SMS
    </button>
  );
};

export default SmsOrder;
