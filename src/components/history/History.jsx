import React, { useState, useEffect } from "react";
import "./History.css";
import { FaPrint, FaWhatsapp } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { fetchOrders, removeOrder } from "../../api";
import Header from "../header/Header";
import RawBTPrintButton from "../Utils/RawBTPrintButton";
import WhatsAppButton from "../Utils/WhatsappOrder";
import { MdDelete } from "react-icons/md";
import Rawbt3Inch from "../Utils/Rawbt3Inch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
};

const History = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [grandTotal, setGrandTotal] = useState({
    total: 0,
    cash: 0,
    credit: 0,
  });
  const [filter, setFilter] = useState("Today");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Show remove button on long press
  let pressTimer;
  const handlePressStart = () => {
    pressTimer = setTimeout(() => {
      setShowRemoveBtn(true);
    }, 1000);
  };
  const handlePressEnd = () => {
    clearTimeout(pressTimer);
  };

  // Calculate totals function
  const calculateTotals = (ordersArray) => {
    let total = 0;
    let cashTotal = 0;
    let creditTotal = 0;

    ordersArray.forEach((order) => {
      total += order.totalAmount || 0;

      if (order.saleType === "cash") {
        cashTotal += order.totalAmount || 0;
      } else if (order.saleType === "credit") {
        creditTotal += order.totalAmount || 0;
      } else if (order.saleType === "partial") {
        // For partial payments, add paid amount to cash and credit amount to credit
        cashTotal += order.paidAmount || 0;
        creditTotal += order.creditAmount || 0;
      }
    });

    return {
      total: parseFloat(total.toFixed(2)),
      cash: parseFloat(cashTotal.toFixed(2)),
      credit: parseFloat(creditTotal.toFixed(2)),
    };
  };

  const handleRemoveOrder = async (orderId, orderPhone) => {
    try {
      const advanceFeatured =
        localStorage.getItem("advancedFeature") === "true";

      if (!advanceFeatured) {
        setModalMessage("Advance feature not granted.");
        setIsModalOpen(true);
        return;
      }

      const confirmDelete = window.confirm(
        "This will permanently delete the order. Are you sure?"
      );
      if (!confirmDelete) return;

      // Delete the order
      await removeOrder(orderId);

      // Update customer totals in database
      // if (orderPhone) {
      //   await updateCustomerTotals(orderPhone);
      // }

      // Update local state
      const updatedOrders = orders.filter((o) => o.id !== orderId);
      setOrders(updatedOrders);

      // Recalculate filtered orders based on current filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysAgo = getDaysAgo(filter);
      const startOfSelectedDay = new Date(today);
      startOfSelectedDay.setDate(today.getDate() - daysAgo);
      const endOfSelectedDay = new Date(startOfSelectedDay);
      endOfSelectedDay.setHours(23, 59, 59, 999);

      const updatedFilteredOrders = updatedOrders.filter((order) => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= startOfSelectedDay && orderDate <= endOfSelectedDay;
      });

      setFilteredOrders(updatedFilteredOrders);

      // Recalculate totals
      const newTotals = calculateTotals(updatedFilteredOrders);
      setGrandTotal(newTotals);

      toast.success("Order deleted successfully", toastOptions);
    } catch (error) {
      console.error("Error removing order:", error.message);
      toast.error("Failed to delete order", toastOptions);
    }
  };

  useEffect(() => {
    const getOrders = async () => {
      setLoading(true);
      try {
        const data = await fetchOrders();
        setOrders(data);
        console.log("fetching order ", data)

        // Calculate start and end time for the selected day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysAgo = getDaysAgo(filter);
        const startOfSelectedDay = new Date(today);
        startOfSelectedDay.setDate(today.getDate() - daysAgo);
        const endOfSelectedDay = new Date(startOfSelectedDay);
        endOfSelectedDay.setHours(23, 59, 59, 999);

        // Filter orders for the selected day
        const dayOrders = data.filter((order) => {
          const orderDate = new Date(order.timestamp);
          return (
            orderDate >= startOfSelectedDay && orderDate <= endOfSelectedDay
          );
        });

        setFilteredOrders(dayOrders);

        // Calculate totals
        const totals = calculateTotals(dayOrders);
        setGrandTotal(totals);
      } catch (error) {
        console.error("Error fetching orders:", error.message);
      } finally {
        setLoading(false);
      }
    };

    getOrders();
  }, [filter]);

  // Helper to get "days ago" count
  const getDaysAgo = (filterValue) => {
    switch (filterValue) {
      case "Today":
        return 0;
      case "Yesterday":
        return 1;
      default:
        return parseInt(filterValue.split(" ")[0]);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const formatDate = (isoString) => {
    const orderDate = new Date(isoString);
    const day = orderDate.getDate();
    const month = orderDate.toLocaleString("default", { month: "short" });
    const year = orderDate.getFullYear();
    const hours = orderDate.getHours() % 12 || 12;
    const minutes = orderDate.getMinutes().toString().padStart(2, "0");
    const period = orderDate.getHours() >= 12 ? "PM" : "AM";

    return `${month} ${day}, ${year} - ${hours}:${minutes} ${period}`;
  };

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  const toggleOrder = (orderId) => {
    setExpandedOrderId((prevId) => (prevId === orderId ? null : orderId));
  };

  const handleWhatsappClick = (order) => {
    const customerPhoneNumber = order.phone;
    const message = `We hope you had a delightful order experience with us. Your feedback is incredibly valuable as we continue to enhance our services. How did you enjoy your meal? We'd love to hear your thoughts.\nTeam: Foodies Hub`;
    const whatsappUrl = `https://wa.me/+91${customerPhoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank");
  };

  // Function to get the total amount for a specific day
  const getTotalForDay = (daysAgo) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - daysAgo);

    const dayOrders = orders.filter((order) => {
      const orderDate = new Date(order.timestamp);
      return (
        orderDate.getDate() === targetDate.getDate() &&
        orderDate.getMonth() === targetDate.getMonth() &&
        orderDate.getFullYear() === targetDate.getFullYear()
      );
    });

    const totals = calculateTotals(dayOrders);
    return totals.total;
  };

  return (
    <div>
      <ToastContainer />
      <Header headerName="Order History" />
      {loading ? (
        <div className="lds-ripple">
          <div></div>
          <div></div>
        </div>
      ) : (
        <div className="history-container">
          <div className="grand-total">
            <h2 className="total-sale">
              <select
                id="filter"
                value={filter}
                onChange={handleFilterChange}
                style={{ borderRadius: "1rem" }}
              >
                <option value="Today">Today ₹{getTotalForDay(0)}</option>
                <option value="Yesterday">
                  Yesterday ₹{getTotalForDay(1)}
                </option>
                {[...Array(6)].map((_, i) => (
                  <option key={i} value={`${i + 2} days ago`}>
                    {i + 2} days ago ₹{getTotalForDay(i + 2)}
                  </option>
                ))}
              </select>
            </h2>
            <div className="paymentType">
              <p>Cash: ₹{grandTotal.cash.toFixed(2)}</p>
              <p>Credit: ₹{grandTotal.credit.toFixed(2)}</p>
            </div>
          </div>

          {filteredOrders.length > 0 ? (
            [...filteredOrders].reverse().map((order, index) => (
              <div
                key={order.id}
                className="order-section"
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
              >
                <div
                  onClick={() => toggleOrder(order.id)}
                  className="order-lable"
                >
                  <h2>
                    Order {filteredOrders.length - index} -{" "}
                    <span>{formatDate(order.timestamp)}</span>
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>
                      Amount: ₹{order.totalAmount?.toFixed(2) || "0.00"}
                    </strong>
                    {order.saleType && (
                      <span
                        style={{
                          position: "absolute",
                          right: "2rem",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          backgroundColor:
                            order.saleType === "cash"
                              ? "#4CAF50"
                              : order.saleType === "credit"
                              ? "#FF9800"
                              : "#2196F3",
                          color: "white",
                        }}
                        className="saletypedaywise"
                      >
                        {order.saleType.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {showRemoveBtn && (
                    <button
                      className="deletebtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOrder(order.id, order.phone);
                      }}
                    >
                      <MdDelete />
                    </button>
                  )}
                </div>

                {expandedOrderId === order.id && (
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.products?.map((product, idx) => (
                        <tr key={idx}>
                          <td>
                            {product.size
                              ? `${product.name} (${product.size})`
                              : product.name}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            ₹{product.price || 0}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {product.quantity || 1}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            ₹{(product.price || 0) * (product.quantity || 1)}
                          </td>
                        </tr>
                      ))}

                      {/* DELIVERY ROW */}
                      {order.delivery > 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <strong>Delivery</strong>
                          </td>
                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <strong>+₹{order.delivery || 0}</strong>
                          </td>
                        </tr>
                      )}

                      {/* DISCOUNT ROW */}
                      {order.discount > 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <strong>Discount</strong>
                          </td>

                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <strong>-₹{order.discount || 0}</strong>
                          </td>
                        </tr>
                      )}

                      {/* GST ROW */}
                      {order.gstAmount > 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <strong>APMC (2%)</strong>
                          </td>

                          <td colSpan={2} style={{ textAlign: "right" }}>
                            <strong>+₹{order.gstAmount || 0}</strong>
                          </td>
                        </tr>
                      )}

                      {/* Payment details for partial payments */}
                      {order.saleType === "partial" && (
                        <>
                          <tr>
                            <td>
                              <strong>Paid Amount</strong>
                            </td>
                            <td></td>
                            <td></td>
                            <td style={{ textAlign: "right" }}>
                              <strong>₹{order.paidAmount || 0}</strong>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <strong>Credit Amount</strong>
                            </td>
                            <td></td>
                            <td></td>
                            <td style={{ textAlign: "right" }}>
                              <strong>₹{order.creditAmount || 0}</strong>
                            </td>
                          </tr>
                        </>
                      )}

                      {/* ICONS ROW */}
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          <RawBTPrintButton
                            productsToSend={order.products}
                            customerPhone={order.phone}
                            customerName={order.name}
                            deliveryChargeAmount={order.delivery}
                            parsedDiscount={order.discount}
                            timestamp={order.timestamp}
                            gstAmount={order.gstAmount}
                            icon={() => (
                              <FaPrint
                                size={32}
                                style={{
                                  color: "#1abc9c",
                                  transition: "transform 0.1s ease",
                                  textAlign: "center",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.transform =
                                    "scale(1.2)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.transform = "scale(1)")
                                }
                              />
                            )}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            ))
          ) : (
            <p>No orders found for {filter.toLowerCase()}.</p>
          )}
        </div>
      )}
      {/* Custom Modal */}
      {isModalOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content-history">
            <p className="custom-modal-message-history">{modalMessage}</p>
            <div className="custom-modal-actions">
              <button
                className="custom-modal-button confirm-button-history"
                onClick={() => setIsModalOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
