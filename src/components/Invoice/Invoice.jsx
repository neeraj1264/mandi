import React, { useEffect, useState } from "react";
import { FaImage } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import "./Invoice.css";
import {
  FaMinusCircle,
  FaPlusCircle,
  FaTimesCircle,
  FaSearch,
} from "react-icons/fa";
import Header from "../header/Header";
import { fetchProducts, removeProduct } from "../../api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomerInfoModal from "../CustomerInfoModal";
import QuantityPriceModal from "../QuantityPriceModal";


const toastOptions = {
  position: "bottom-right",
  autoClose: 2000,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
  width: "90%",
};

const Invoice = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productsToSend, setProductsToSend] = useState([]);
  const [Search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCategoryVisible, setIsCategoryVisible] = useState(false);
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);
  const [qtyModalProduct, setQtyModalProduct] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

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

  // Load products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const products = await fetchProducts();
        setSelectedProducts(products);
      } catch (error) {
        console.error("Error fetching products:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const stored = JSON.parse(localStorage.getItem("productsToSend")) || [];
    setProductsToSend(stored);
    localStorage.removeItem("deliveryCharge");
  }, []);

  // Utility: save to localStorage
  const persistProductsToSend = (arr) => {
    localStorage.setItem("productsToSend", JSON.stringify(arr));
  };

  // Add item from modal (or update quantity if exists)
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
        // increment existing quantity
        updated = [...prev];
        updated[existsIdx] = {
          ...updated[existsIdx],
          quantity: Number(updated[existsIdx].quantity || 0) + Number(item.quantity || 0),
          price: Number(item.price),
        };
        toast.success("Quantity updated", toastOptions);
      } else {
        updated = [...prev, item];
        toast.success("Item added", toastOptions);
      }
      persistProductsToSend(updated);
      return updated;
    });
  };

  // Existing quantity +/- buttons
  const handleQuantityChange = (productName, productPrice, productSize, delta) => {
    const updated = productsToSend
      .map((prod) => {
        if (
          prod.name === productName &&
          Number(prod.price) === Number(productPrice) &&
          (prod.size || "") === (productSize || "")
        ) {
          const newQuantity = (Number(prod.quantity) || 0) + delta;
          if (newQuantity < 1) return null;
          return { ...prod, quantity: newQuantity };
        }
        return prod;
      })
      .filter(Boolean);

    setProductsToSend(updated);
    persistProductsToSend(updated);
  };

  // Remove product from DB + state
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
      (total, product) => total + Number(product.price) * Number(product.quantity),
      0
    );
  };

  const handleCategoryClick = (category) => {
    const categoryElement = document.getElementById(category);
    if (categoryElement) {
      const offset = 7 * 16;
      const elementPosition = categoryElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsCategoryVisible((prev) => !prev);
  };

  // Open quantity/price modal for product
  const handleOpenQtyModal = (product) => {
    setQtyModalProduct(product);
  };

  const handleCloseQtyModal = () => {
    setQtyModalProduct(null);
  };



  return (
    <div>
      <ToastContainer />
      <Header headerName="Foodies Hub" setSearch={setSearch} onClick={() => setIsCategoryVisible(p => !p)} />

      {isCategoryVisible && (
        <div className="category-b">
          <div className="category-bar">
            {Object.keys(filteredProducts)
              .sort((a, b) => a.localeCompare(b))
              .map((category, index) => (
                <button key={index} className="category-btn" onClick={() => handleCategoryClick(category)}>
                  {category}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="main">
        {loading ? (
          <div className="lds-ripple"><div></div><div></div></div>
        ) : Object.keys(filteredProducts).length > 0 ? (
          Object.keys(filteredProducts)
            .sort((a, b) => a.localeCompare(b))
            .map((category, index) => (
              <div key={index} className="category-container">
                <h2 className="category" id={category}>{category}</h2>
                {filteredProducts[category]
                  .sort((a, b) => (a.price || 0) - (b.price || 0))
                  .map((product, idx) => (
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
                            {product.varieties && Array.isArray(product.varieties) && product.varieties[0]?.size ? ` (${product.varieties[0].size})` : ""}
                          </h4>
                          <p className="p-name-price">
                            {/* Rs.{" "}
                            {product.price
                              ? Number(product.price).toFixed(2)
                              : product.varieties && product.varieties.length > 0
                                ? Number(product.varieties[0].price).toFixed(2)
                                : "N/A"} */}
                            {showRemoveBtn && (
                              <span className="remove-btn" onClick={() => handleRemoveProduct(product.name, product.price)}>
                                <FaTimesCircle />
                              </span>
                            )}
                          </p>
                        </div>

                        {productsToSend.some(
                          (prod) =>
                            prod.name === product.name &&
                            Number(prod.price) === Number(product.price) &&
                            (prod.size || "") === (product.size || "")
                        ) ? (
                          <div className="quantity-btns">
                            <button className="icons" onClick={() => handleQuantityChange(product.name, product.price, product.size, -1)}>
                              <FaMinusCircle />
                            </button>
                            <span style={{ margin: "0 .4rem" }}>
                              {productsToSend.find(
                                (prod) =>
                                  prod.name === product.name &&
                                  Number(prod.price) === Number(product.price) &&
                                  (prod.size || "") === (product.size || "")
                              )?.quantity || 1}
                            </span>
                            <button className="icons" onClick={() => handleQuantityChange(product.name, product.price, product.size, 1)}>
                              <FaPlusCircle />
                            </button>
                          </div>
                        ) : (
                          <div className="btn-box">
                            <button onClick={() => handleOpenQtyModal(product)} className="add-btn">
                              Add
                            </button>
                            {product.varieties?.length > 0 && <span className="customise-text">Customise</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ))
        ) : (
          <div className="no-data">No data available</div>
        )}
      </div>

      <div className="invoice-btn">
        <button onClick={() => { navigate("/NewProduct"); }} className="invoice-kot-btn">
          <h2> + PRODUCT </h2>
        </button>

        <button onClick={()=>navigate("/customer-detail")} className="invoice-next-btn">
          <h2> NEXT ₹{calculateTotalPrice(productsToSend).toFixed(2)} </h2>
        </button>
      </div>

      {qtyModalProduct && (
        <QuantityPriceModal
          product={qtyModalProduct}
          onSave={(item) => handleAddFromModal(item)}
          onClose={handleCloseQtyModal}
        />
      )}
    </div>
  );
};

export default Invoice;
