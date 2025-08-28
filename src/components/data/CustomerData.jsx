import React, { useEffect, useState } from "react";
import "./CustomerData.css"; // Import the CSS file
import { fetchcustomerdata, fetchOrders } from "../../api"; // Import fetchOrders as well
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "../header/Header";

export const CustomerData = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]); // State for orders
  const [filteredCustomers, setFilteredCustomers] = useState([]); // State for filtered customers
  const [loading, setLoading] = useState(false); // Loading state
  const [Search, setSearch] = useState(""); // State for search query
  const [expandedCustomer, setExpandedCustomer] = useState(null); // To track which customer is expanded
  const navigate = useNavigate();

  // Fetch customers from API and localStorage fallback
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const storedCustomers = await fetchcustomerdata();
        setCustomers(storedCustomers);
        setFilteredCustomers(storedCustomers);
      } catch (error) {
        console.error("Error fetching customer data:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Fallback: load customers from localStorage if available
    const localStorageCustomers =
      JSON.parse(localStorage.getItem("customers")) || [];
    if (localStorageCustomers.length > 0) {
      setCustomers(localStorageCustomers);
      setFilteredCustomers(localStorageCustomers);
    }
  }, []);

  // Fetch orders from API
  useEffect(() => {
    const getOrders = async () => {
      try {
        const ordersData = await fetchOrders(); // Fetch orders from API
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error.message);
      }
    };

    getOrders();
  }, []);

  // Filter customers based on search query
  useEffect(() => {
    const searchLower = Search.toLowerCase();

    const results = customers.filter((customer) => {
      const nameMatch =
        customer.name && customer.name.toLowerCase().includes(searchLower);
      const phoneMatch =
        customer.phone &&
        String(customer.phone).toLowerCase().includes(searchLower);
      const addressMatch =
        customer.address &&
        customer.address.toLowerCase().includes(searchLower);
      return nameMatch || phoneMatch || addressMatch;
    });

    setFilteredCustomers(results);
  }, [Search, customers]);

  // --- NEW: compute totals for a customer by phone ---
  const getCustomerTotals = (phone) => {
    const custOrders = orders.filter((order) => String(order.phone) === String(phone));

    // initialize totals
    const totals = custOrders.reduce(
      (acc, order) => {
        // defensive numeric parsing
        const totalAmount = Number(order.totalAmount) || 0;
        const paidAmount = Number(order.paidAmount) || 0;
        const creditAmount = Number(order.creditAmount) || 0;

        acc.totalSale += totalAmount;      // sum of totalAmount
        acc.totalPaid += paidAmount;       // sum of paid amounts
        acc.totalCredit += creditAmount;   // sum of credit amounts (owed)
        return acc;
      },
      { totalSale: 0, totalPaid: 0, totalCredit: 0 }
    );

    // round to 2 decimals to avoid floating point weirdness
    totals.totalSale = Number(totals.totalSale.toFixed(1));
    totals.totalPaid = Number(totals.totalPaid.toFixed(1));
    totals.totalCredit = Number(totals.totalCredit.toFixed(1));
    return totals;
  };

  // Toggle the expanded customer details (show order items grouped by date)
  const handleCustomerClick = (phone) => {
    if (expandedCustomer === phone) {
      setExpandedCustomer(null); // Collapse if already expanded
    } else {
      setExpandedCustomer(phone); // Expand the clicked customer
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <Header headerName="Customer Data" setSearch={setSearch} />
      <div className="customer-data-container">
        {loading ? (
          <div className="lds-ripple">
            <div></div>
            <div></div>
          </div>
        ) : (
          <>
            {filteredCustomers.length === 0 ? (
              <p className="no-customers-message">No customers found.</p>
            ) : (
              <ul className="customer-list">
                {filteredCustomers.map((customer, index) => {
                  const totals = getCustomerTotals(customer.phone);
                  return (
                    <li
                      key={index}
                      className="customer-item"
                      onClick={() => handleCustomerClick(customer.phone)}
                      style={{ cursor: "pointer" }}
                    >
                      <h3 className="customer-title">Customer {index + 1}</h3>
                      <p>
                        <strong>Name:</strong> {customer.name}
                      </p>
                      <p>
                        <strong>Phone:</strong> {customer.phone}
                      </p>
                      <p>
                        <strong>Address:</strong> {customer.address}
                      </p>

                      {/* NEW: show Total Sale and Total Credit */}
                      <p>
                        <strong>Total Sale:</strong> ₹{totals.totalSale.toFixed(1)}
                      </p>
                      <p>
                        <strong>Total Credit:</strong> ₹{totals.totalCredit.toFixed(1)}
                      </p>
                      <p>
                        <strong>Total Cash:</strong> ₹{totals.totalPaid.toFixed(1)}
                      </p>

                      {/* Expanded view: display orders grouped by date */}
                      {expandedCustomer === customer.phone && (
                        <div className="customer-orders">
                          {(() => {
                            // Filter orders for the current customer
                            const customerOrders = orders.filter(
                              (order) =>
                                String(order.phone) === String(customer.phone)
                            );

                            // Group orders by the date (using local date string)
                            const ordersByDate = customerOrders.reduce(
                              (group, order) => {
                                const dateKey = new Date(
                                  order.timestamp
                                ).toLocaleDateString();
                                if (!group[dateKey]) {
                                  group[dateKey] = [];
                                }
                                group[dateKey].push(order);
                                return group;
                              },
                              {}
                            );

                            // Sort dates in descending order (newest first)
                            const sortedDates = Object.keys(ordersByDate).sort(
                              (a, b) => new Date(b) - new Date(a)
                            );

                            return sortedDates.map((date, idx) => {
                              const ordersOnDate = ordersByDate[date];

                              // Calculate the total price for orders on this date
                              const totalOnDate = ordersOnDate.reduce(
                                (sum, order) => sum + (Number(order.totalAmount) || 0),
                                0
                              );

                              // Calculate paid/credit on this date
                              const paidOnDate = ordersOnDate.reduce(
                                (sum, order) => sum + (Number(order.paidAmount) || 0),
                                0
                              );
                              const creditOnDate = ordersOnDate.reduce(
                                (sum, order) => sum + (Number(order.creditAmount) || 0),
                                0
                              );

                              return (
                                <div
                                  key={idx}
                                  className="customer-order-date-group"
                                >
                                  <h4>Date: {date}</h4>
                                  <ul>
                                    {ordersOnDate.map((order, orderIndex) => (
                                      <li key={order.id || orderIndex} style={{ marginBottom: 8 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <span className="time">
                                            Time:{" "}
                                            {new Date(
                                              order.timestamp
                                            ).toLocaleTimeString()}
                                          </span>
                                          <span style={{ fontWeight: 600 }}>
                                            ₹{(Number(order.totalAmount) || 0).toFixed(1)}
                                          </span>
                                        </div>

                                        {/* NEW: show sale type and paid/credit breakdown */}
                                        <div style={{ marginTop: 6, marginBottom: 6 }}>
                                          <strong>Sale Type:</strong> {order.saleType || "cash"}
                                          {"  |  "}
                                          <strong>Paid:</strong> ₹{(Number(order.paidAmount) || 0).toFixed(1)}
                                          {"  |  "}
                                          <strong>Credit:</strong> ₹{(Number(order.creditAmount) || 0).toFixed(1)}
                                        </div>

                                        <ul style={{ marginLeft: 14 }}>
                                          {order.products && order.products.map(
                                            (product, pIndex) => (
                                              <li key={pIndex}>
                                                {pIndex + 1}. {product.name}{" "}
                                                {product.quantity ? `x${product.quantity}` : ""}
                                                {" — "}₹{(Number(product.price) || 0).toFixed(1)}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      </li>
                                    ))}
                                  </ul>

                                  <p>
                                    <strong>Total Price Spent on {date}:</strong>{" "}
                                    ₹{totalOnDate.toFixed(1)}
                                  </p>
                                  <p>
                                    <strong>Paid on {date}:</strong> ₹{paidOnDate.toFixed(1)}
                                  </p>
                                  <p>
                                    <strong>Credit on {date}:</strong> ₹{creditOnDate.toFixed(1)}
                                  </p>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default CustomerData;
