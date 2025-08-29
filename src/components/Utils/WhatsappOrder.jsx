import React from "react";
export default function WhatsAppButton({
  productsToSend,
  deliveryChargeAmount,
  deliveryCharge,
  parsedDiscount,
  customerPhone,
  customerAddress,
  restaurantName,
  totalCustomerCredit,
  gstAmount,
  ComissionAmount,
}) {
  // Helper to calculate total price of items
  const calculateTotalPrice = (items = []) =>
    items.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0);

  const handleSendToWhatsApp = () => {
    // Compute current total
    const currentTotal =
      calculateTotalPrice(productsToSend) +
      gstAmount + 
      ComissionAmount +
      deliveryChargeAmount -
      parsedDiscount;

    // Map product details
    const productDetails = productsToSend
      .map((product, i) => {
        const qty = product.quantity || 1;
        const qtyType = product.quantityType || "kg";
        const quantity = `${qty} ${qtyType}`;
        const sizeLabel = product.size ? ` ${product.size}` : "";
        return `${i + 1}.${product.name}${sizeLabel} - ${quantity} x ${product.price} = ₹${
          product.price * qty
        }`;
      })
      .join("\n");

    // Optional charges
     const gstAmountText = gstAmount
      ? `APMC: (2%) ₹${gstAmount}` 
      : "";
      const ComissionAmountText = ComissionAmount
      ? `APMC: (5%) ₹${ComissionAmount}` 
      : "";

    const serviceText = deliveryCharge
      ? `Service Charge: ₹${deliveryChargeAmount}`
      : "";
    const discountText = parsedDiscount
      ? `Discount: -₹${parsedDiscount}`
      : "";

    // Order ID
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    // Construct message
    const message = encodeURIComponent(
      `*Chhinnamastika Traders*\n\n` +
        `Order: *${orderId}*` +
        (customerPhone ? `\nPhone: *${customerPhone}*` : "") +
        (customerAddress ? `\nAddress: *${customerAddress}*` : "") +
        `\nAmount: *₹${currentTotal}*` +
        (totalCustomerCredit ? `\nBalance: *₹${totalCustomerCredit}*` : "") +
        `\n\n----------item----------\n${productDetails}` +
        (serviceText ? `\n${serviceText}` : "") +
        (discountText ? `\n${discountText}` : "") +
        (gstAmountText ? `\n${gstAmountText}`: "") +
        (ComissionAmountText ? `\n${ComissionAmountText}`: "")
    );

    // Format number for WhatsApp
    const formattedPhone = `+91${customerPhone}`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(waUrl, "_blank");
  };

  return (
    <button onClick={handleSendToWhatsApp} className="popupButton">
      Send to WhatsApp
    </button>
  );
}
