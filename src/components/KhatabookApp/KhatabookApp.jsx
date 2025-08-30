import React, { useEffect, useState } from "react";
import { fetchcustomerdata, setdata, addKhataTransaction } from "../../api";
import "./KhataBookApp.css";
import Header from "../header/Header";

export default function KhataBook() {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [amount, setAmount] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  // 🔍 Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingTransaction, setLoadingTransaction] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await fetchcustomerdata();
    setCustomers(data);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return alert("Fill details");

    if (!/^\d{10}$/.test(newCustomer.phone)) {
      return alert("Please enter a valid 10-digit phone number");
    }

    // ✅ ensure default values for new customer
    const customerData = {
      ...newCustomer,
      totalCash: 0,
      totalOwed: 0,
    };

    await setdata(customerData);
    setNewCustomer({ name: "", phone: "" });
    setShowAddCustomer(false);
    loadCustomers();
  };

  const handleTransaction = async (customerId, type) => {
    if (!amount) return alert("Enter amount");
    try {
      setLoadingTransaction(true); // ⏳ start loading
      await addKhataTransaction(customerId, {
        type,
        amount: parseFloat(amount),
      });
      setAmount("");
      setActiveTransaction(null);
      await loadCustomers();
    } catch (err) {
      console.error("Transaction failed:", err);
      alert("Failed to save transaction");
    } finally {
      setLoadingTransaction(false); // ✅ stop loading
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);

  // 🔍 Filter customers by search query
  const filteredCustomers = customers.filter(
    (c) =>
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  // 🔽 Add these derived totals before return
  const totalYouWillGet = customers.reduce((sum, c) => {
    const owed = (c.lifetimeSale || 0) - (c.receivedAmount || 0);
    return owed > 0 ? sum + owed : sum;
  }, 0);

  const totalYouWillGave = customers.reduce((sum, c) => {
    const owed = (c.lifetimeSale || 0) - (c.receivedAmount || 0);
    return owed < 0 ? sum + Math.abs(owed) : sum;
  }, 0);

  return (
    <>
      <Header headerName="Customer Data" />
      <div className="khata-container">
        {/* Header */}
        <div className="khata-header">
          <h1 className="khata-title">
            <i className="fas fa-book"></i> Khata Book
          </h1>
          <div className="header-actions">
            <button onClick={() => setShowAddCustomer(!showAddCustomer)}>
              <i className="fas fa-user-plus"></i>
            </button>
            <button onClick={() => setShowSearch(!showSearch)}>
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Balance Summary */}
        <div className="balance-summary">
          <div>
            <div className="balance-title">You Will Get</div>
            <div className="balance-amount positive">
              {formatCurrency(totalYouWillGet)}
            </div>
          </div>
          <div>
            <div className="balance-title">You Will Give</div>
            <div className="balance-amount negative">
              {formatCurrency(totalYouWillGave)}
            </div>
          </div>
        </div>

        {/* Add Customer Form */}
        {showAddCustomer && (
          <div className="add-customer-box">
            <h3>Add New Customer</h3>
            <div className="input-group">
              <input
                placeholder="Name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
              />
              <input
                placeholder="Phone Number"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
              />
            </div>
            <div className="form-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowAddCustomer(false)}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleAddCustomer}>
                Save Customer
              </button>
            </div>
          </div>
        )}

        {/* Customer List */}
        <div className="customer-list">
          {filteredCustomers
            .filter((c) => c.name && c.phone)
            .map((c) => {
              const owed = (c.lifetimeSale || 0) - (c.receivedAmount || 0);

              let balanceText = "";
              let balanceClass = "";

              if (owed > 0) {
                balanceText = `You will get ${formatCurrency(owed)}`;
                balanceClass = "positive";
              } else if (owed === 0) {
                balanceText = "Settled";
                balanceClass = "neutral";
              } else {
                balanceText = `You will give ${formatCurrency(Math.abs(owed))}`;
                balanceClass = "negative";
              }

              return (
                <div key={c._id} className="customer-card">
                  <div
                    className="customer-info"
                    onClick={() =>
                      setExpandedCustomer(
                        expandedCustomer === c._id ? null : c._id
                      )
                    }
                  >
                    <div className="customer-avatar">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="customer-details">
                      <h3>{c.name}</h3>
                      <p>{c.phone}</p>
                    </div>
                    <div className={`customer-balance ${balanceClass}`}>
                      {balanceText}
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {expandedCustomer === c._id && (
                    <>
                      <div className="customer-stats">
                        <div className="stat">
                          <div className="stat-label">Received</div>
                          <div className="stat-value received">
                            {formatCurrency(c.receivedAmount)}
                          </div>
                        </div>
                        <div className="stat">
                          <div className="stat-label">You paid</div>
                          <div className="stat-value">
                            {formatCurrency(c.lifetimeSale)}
                          </div>
                        </div>
                      </div>

                      <div className="transaction-buttons">
                        <button
                          className="btn-received"
                          onClick={() =>
                            setActiveTransaction(
                              activeTransaction?.customerId === c._id &&
                                activeTransaction?.type === "received"
                                ? null
                                : { customerId: c._id, type: "received" }
                            )
                          }
                        >
                          <i className="fas fa-download"></i> Received
                        </button>
                        <button
                          className="btn-gave"
                          onClick={() =>
                            setActiveTransaction(
                              activeTransaction?.customerId === c._id &&
                                activeTransaction?.type === "gave"
                                ? null
                                : { customerId: c._id, type: "gave" }
                            )
                          }
                        >
                          <i className="fas fa-upload"></i> Paid
                        </button>
                      </div>

                      {/* Contact Row */}
                      <div className="contact-row">
                        {owed > 0 && (
                          <>
                            <button
                              className="contact-btn whatsappp"
                              onClick={() => {
                                const message = `Chhinnamastika Traders requests a payment of ${formatCurrency(
                                  Math.abs(owed)
                                )}. Please clear your dues.`;
                                window.open(
                                  `https://wa.me/91${
                                    c.phone
                                  }?text=${encodeURIComponent(message)}`,
                                  "_blank"
                                );
                              }}
                            >
                              <i className="fab fa-whatsapp"></i>
                            </button>

                            <button
                              className="contact-btn sms"
                              onClick={() => {
                                const message = `Chhinnamastika Traders requests a payment of ${formatCurrency(
                                  Math.abs(owed)
                                )}. Please clear your dues.`;
                                window.open(
                                  `sms:+91${c.phone}?body=${encodeURIComponent(
                                    message
                                  )}`
                                );
                              }}
                            >
                              <i className="fas fa-sms"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {/* Transaction Input */}
                  {activeTransaction?.customerId === c._id && (
                    <div className="transaction-input">
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <div className="transaction-actions">
                        {activeTransaction.type === "received" && (
                          <button
                            className="btn-confirm-received"
                            onClick={() => handleTransaction(c._id, "received")}
                            disabled={loadingTransaction}
                          >
                            {loadingTransaction ? (
                              <i className="fas fa-spinner fa-spin"></i> // ⏳ spinner icon
                            ) : (
                              <>
                                <i className="fas fa-check"></i> Confirm
                                Received
                              </>
                            )}
                          </button>
                        )}

                        {activeTransaction.type === "gave" && (
                          <button
                            className="btn-confirm-gave"
                            onClick={() => handleTransaction(c._id, "gave")}
                            disabled={loadingTransaction}
                          >
                            {loadingTransaction ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <>
                                <i className="fas fa-check"></i> Confirm Paid
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
