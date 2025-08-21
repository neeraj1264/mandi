// Invoice.jsx
import React, { useEffect, useState } from "react";
import { FaMinusCircle, FaPlusCircle, FaTimesCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Invoice.css";
import Header from "../header/Header";
import { fetchProducts, removeProduct } from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import QuantityPriceModal from "../quantityModal/QuantityPriceModal";

const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
  width: "90%",
};

export default function Invoice() {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productsToSend, setProductsToSend] = useState([]);
  const [productPrices, setProductPrices] = useState({});
  const [Search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCategoryVisible, setIsCategoryVisible] = useState(false);
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);
  const [qtyModalProduct, setQtyModalProduct] = useState(null);

  const navigate = useNavigate();

  let pressTimer;

  const handlePressStart = () => {
    pressTimer = setTimeout(() => {
      setShowRemoveBtn(true);
    }, 1000);
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const products = await fetchProducts();
        setSelectedProducts(products || []);
      } catch (error) {
        console.error("Error fetching products:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const stored = JSON.parse(localStorage.getItem("productsToSend")) || [];
    setProductsToSend(stored);
    
    // Load product prices from localStorage
    const storedPrices = JSON.parse(localStorage.getItem("productPrices")) || {};
    setProductPrices(storedPrices);
    
    localStorage.removeItem("deliveryCharge");
  }, []);

  const persistProductsToSend = (arr) => {
    localStorage.setItem("productsToSend", JSON.stringify(arr));
  };

  // Function to update and persist product prices
  const updateProductPrice = (productName, size, price) => {
    const key = `${productName}-${size || 'default'}`;
    const updatedPrices = {
      ...productPrices,
      [key]: price
    };
    
    setProductPrices(updatedPrices);
    localStorage.setItem("productPrices", JSON.stringify(updatedPrices));
  };

  // 1) Add item from modal (uniqueness by name + size + price)
  const handleAddFromModal = (item) => {
    setProductsToSend((prev) => {
      const existsIdx = prev.findIndex(
        (p) =>
          p.name === item.name &&
          (p.size || "") === (item.size || "") &&
          Number(p.price) === Number(item.price)
      );

      let updated;
      if (existsIdx > -1) {
        updated = [...prev];
        updated[existsIdx] = {
          ...updated[existsIdx],
          quantity:
            Number(updated[existsIdx].quantity || 0) +
            Number(item.quantity || 0),
          price: Number(item.price)
        };
        toast.success("Quantity updated", toastOptions);
      } else {
        updated = [...prev, {
          ...item,
          price: Number(item.price)
        }];
      }
      
      // Save the price separately
      updateProductPrice(item.name, item.size || "", Number(item.price));
      
      persistProductsToSend(updated);
      return updated;
    });
  };

  // helper: total quantity across all cart lines matching product by name+size
  const totalQtyByNameSize = (product) => {
    if (!productsToSend || productsToSend.length === 0) return 0;
    return productsToSend
      .filter(
        (p) =>
          p.name === product.name && (p.size || "") === (product.size || "")
      )
      .reduce((s, p) => s + Number(p.quantity || 0), 0);
  };

  // helper: find last index in cart matching by name+size (used for +/- to act on the most recent price-line)
  const findLastIndexByNameSize = (product) => {
    if (!productsToSend || productsToSend.length === 0) return -1;
    for (let i = productsToSend.length - 1; i >= 0; i--) {
      const p = productsToSend[i];
      if (p.name === product.name && (p.size || "") === (product.size || "")) {
        return i;
      }
    }
    return -1;
  };

  // 2) +/- operate on the last matching cart line
  const handleQuantityChange = (product, delta) => {
    const idx = findLastIndexByNameSize(product);
    if (idx === -1) return;

    const updated = [...productsToSend];
    const current = updated[idx];
    const newQuantity = (Number(current.quantity) || 0) + delta;

    if (newQuantity < 1) {
      // remove that line
      updated.splice(idx, 1);
    } else {
      updated[idx] = { ...current, quantity: newQuantity };
    }

    setProductsToSend(updated);
    persistProductsToSend(updated);
  };

  // rest of your file unchanged except render logic uses totalQtyByNameSize
  const filteredProducts = selectedProducts
    .filter((product) =>
      product.name.toLowerCase().includes(Search.toLowerCase())
    )
    .reduce((acc, product) => {
      const category = product.category || "Others";
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
    }, {});

  const handleRemoveProduct = async (productName, productPrice) => {
    try {
      await removeProduct(productName, productPrice);

      const updatedSelected = selectedProducts.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );
      const updatedToSend = productsToSend.filter(
        (prod) => !(prod.name === productName && prod.price === productPrice)
      );

      setSelectedProducts(updatedSelected);
      setProductsToSend(updatedToSend);
      localStorage.setItem("products", JSON.stringify(updatedSelected));
      persistProductsToSend(updatedToSend);
      toast.success("Product removed", toastOptions);
    } catch (error) {
      console.error("Error removing product:", error.message);
      toast.error("Error removing product", toastOptions);
    }
  };

  const calculateTotalPrice = (products = []) => {
    return products.reduce(
      (total, product) =>
        total + Number(product.price) * Number(product.quantity),
      0
    );
  };

  // helper: get last price used for this product
  const getLastPriceByNameSize = (product) => {
    // Get the appropriate size for the product
    let size = "";
    if (product.varieties && product.varieties.length > 0) {
      size = product.varieties[0].size || "";
    } else {
      size = product.size || "";
    }
    
    const key = `${product.name}-${size || 'default'}`;
    
    // Check if we have a stored price for this product
    if (productPrices[key] !== undefined) {
      return productPrices[key];
    }
    
    // Fallback to the product's base price
    if (product.varieties && product.varieties.length > 0) {
      return product.varieties[0].price;
    }
    
    return product.price || "0";
  };

  return (
    <div>
      <ToastContainer />
      <Header
        headerName="Foodies Hub"
        setSearch={setSearch}
        onClick={() => setIsCategoryVisible((p) => !p)}
      />

      {isCategoryVisible && (
        <div className="category-b">
          <div className="category-bar">
            {Object.keys(filteredProducts)
              .sort((a, b) => a.localeCompare(b))
              .map((category, index) => (
                <button
                  key={index}
                  className="category-btn"
                  onClick={() => {
                    const el = document.getElementById(category);
                    if (el) {
                      window.scrollTo({
                        top: el.offsetTop - 7 * 16,
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  {category}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="main">
        {loading ? (
          <div className="lds-ripple">
            <div></div>
            <div></div>
          </div>
        ) : Object.keys(filteredProducts).length > 0 ? (
          Object.keys(filteredProducts)
            .sort((a, b) => a.localeCompare(b))
            .map((category, index) => (
              <div key={index} className="category-container">
                <h2 className="category" id={category}>
                  {category}
                </h2>
                {filteredProducts[category]
                  .sort((a, b) => (a.price || 0) - (b.price || 0))
                  .map((product, idx) => {
                    const totalQty = totalQtyByNameSize(product);
                    const inCart = totalQty > 0;
                    const displayPrice = getLastPriceByNameSize(product);

                    return (
                      <div key={idx}>
                        <hr />
                        <div className="main-box">
                          <div
                            className="sub-box"
                            onMouseDown={handlePressStart}
                            onMouseUp={handlePressEnd}
                            onTouchStart={handlePressStart}
                            onTouchEnd={handlePressEnd}
                          >
                            <h4 className="p-name">
                              {product.name}
                              {product.varieties &&
                              Array.isArray(product.varieties) &&
                              product.varieties[0]?.size
                                ? ` (${product.varieties[0].size})`
                                : ""}
                            </h4>
                            <p className="p-name-price">
                              Rs. {displayPrice}
                              {showRemoveBtn && (
                                <span
                                  className="remove-btn"
                                  onClick={() =>
                                    handleRemoveProduct(
                                      product.name,
                                      product.price
                                    )
                                  }
                                >
                                  <FaTimesCircle />
                                </span>
                              )}
                            </p>
                          </div>

                          {inCart ? (
                            <div className="quantity-btns">
                              <button
                                className="icons"
                                onClick={() =>
                                  handleQuantityChange(product, -1)
                                }
                              >
                                <FaMinusCircle />
                              </button>
                              <span style={{ margin: "0 .4rem" }}>
                                {totalQty}
                              </span>
                              <button
                                className="icons"
                                onClick={() => handleQuantityChange(product, 1)}
                              >
                                <FaPlusCircle />
                              </button>
                            </div>
                          ) : (
                            <div className="btn-box">
                              <button
                                onClick={() => setQtyModalProduct({ ...product, initialPrice: displayPrice })}
                                className="add-btn"
                              >
                                Add
                              </button>
                              {product.varieties?.length > 0 && (
                                <span className="customise-text">
                                  Customise
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))
        ) : (
          <div className="no-data">No data available</div>
        )}
      </div>

      <div className="invoice-btn">
        <button
          onClick={() => {
            navigate("/NewProduct");
          }}
          className="invoice-kot-btn"
        >
          <h2> + PRODUCT </h2>
        </button>

        <button
          onClick={() => navigate("/customer-detail")}
          className="invoice-next-btn"
        >
          <h2> NEXT ₹{calculateTotalPrice(productsToSend).toFixed(2)} </h2>
        </button>
      </div>

      {qtyModalProduct && (
        <QuantityPriceModal
          product={qtyModalProduct}
          onSave={(item) => {
            handleAddFromModal(item);
            setQtyModalProduct(null);
          }}
          onClose={() => setQtyModalProduct(null)}
        />
      )}
    </div>
  );
}