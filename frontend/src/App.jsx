import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Dealers } from "./pages/Dealers";
import { Orders } from "./pages/Orders";
import { Assistant } from "./pages/Assistant";
import { Forecasting } from "./pages/Forecasting";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/dealers" element={<Dealers />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/forecasting" element={<Forecasting />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
