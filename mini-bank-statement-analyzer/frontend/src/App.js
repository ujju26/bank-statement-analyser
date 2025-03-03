import React, { useState } from "react";
import { fetchTransactions } from "./api/index";
import FileUpload from "./components/FileUpload";
import { Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import "./App.css";

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function App() {
  const [transactions, setTransactions] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadData = async () => {
      try {
          const transactionsData = await fetchTransactions();

          const processed = transactionsData.data.map((tx) => {
              // Convert object keys to lowercase for consistency
              const normalizedTx = Object.keys(tx).reduce((acc, key) => {
                  acc[key.toLowerCase()] = tx[key]; 
                  return acc;
              }, {});

              // Identify deposit & withdrawal fields dynamically
              const deposit = parseFloat(
                  normalizedTx["deposit"] || 
                  normalizedTx["deposits"] || 
                  normalizedTx["deposit (cr)"] || 0
              );
              const withdrawal = parseFloat(
                  normalizedTx["withdrawal"] || 
                  normalizedTx["withdrawable"] || 
                  normalizedTx["withdrawal (cr)"] ||
                  normalizedTx["withdrawal (dr)"] || 0
              );
              const amount = parseFloat(normalizedTx["amount"] || 0);

              if (deposit || withdrawal) {
                  return { ...tx, Amount: deposit - withdrawal };
              }

              if ("amount" in normalizedTx) {
                  return { ...tx, Amount: amount };
              }

              return { ...tx, Amount: 0 }; // Default case
          });

          setTransactions(processed);
          setDataLoaded(true);
      } catch (error) {
          console.error("Error fetching data:", error);
      }
  };



  const calculateSummary = () => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach((tx) => {
      if (tx.Amount > 0) {
        totalIncome += tx.Amount;
      } else {
        totalExpense += Math.abs(tx.Amount);
      }
    });
    return { totalIncome, totalExpense };
  };

  const generatePieChartData = () => {
    const categoryTotals = {};
    transactions.forEach((tx) => {
      const category = tx.Category || tx.category || "Uncategorized";
      categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(tx.Amount || 0);
    });
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    return {
      labels,
      datasets: [
        {
          label: "Transaction Categories",
          data,
          backgroundColor: [
            "#3498db",  // Blue (active tab color)
            "#2ecc71",  // Green (income or positive transactions)
            "#e74c3c",  // Red (expenses or negative transactions)
            "#f1c40f",  // Yellow (neutral or miscellaneous)
            "#9b59b6",  // Purple (special categories)
            "#e67e22",  // Orange (highlighted categories)
            "#1abc9c",  // Turquoise (variety and contrast)
            "#95a5a6",  // Grey (default or uncategorized)
            "#34495e",  // Dark Blue (good contrast with dark theme)
          ],
          hoverOffset: 4,
        },
      ],
    };
  };

  const generateLineChartData = () => {
    const sortedTx = [...transactions].sort((a, b) => {
      const dA = new Date(a.transaction_date || a.Date);
      const dB = new Date(b.transaction_date || b.Date);
      return dA - dB;
    });

    const labels = [];
    const data = [];
    let balance = 0;
    sortedTx.forEach((tx) => {
      const date = new Date(tx.transaction_date || tx.Date);
      labels.push(date.toLocaleDateString());
      balance += tx.Amount || 0;
      data.push(balance);
    });

    return {
      labels,
      datasets: [
        {
          label: "Net Account Balance",
          data,
          fill: false,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    };
  };

  const summaryData = calculateSummary();

  return (
    <Router>
      <div className="app-container">
        <h1 className="app-title">Mini Bank Statement Analyzer</h1>

        {/* File Upload Section */}
        <div className="upload-container">
          <FileUpload onUploadSuccess={loadData} />
        </div>

        {/* Navigation Links */}
        <div className="tabs">
          <Link to="/transactions" className="tab-link">Transactions</Link>
          <Link to="/summary" className="tab-link">Summary</Link>
          <Link to="/chart" className="tab-link">Chart</Link>
          <Link to="/lineChart" className="tab-link">Line Graph</Link>
        </div>

        {/* Routes */}
        <Routes>
          <Route path="/transactions" element={
            dataLoaded && (
              <section className="transaction-details">
                <h2>Transactions</h2>
                <table className="transaction-table">
                  <thead>
                    <tr>{transactions.length > 0 && Object.keys(transactions[0]).map((key) => <th key={key}>{key}</th>)}</tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>{Object.keys(tx).map((key) => <td key={key}>{tx[key]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )
          } />
          
          <Route path="/summary" element={
            dataLoaded && (
              <section className="summary-details">
                <h2>Summary</h2>
                <div className="summary-cards">
                  <div className="summary-card income">
                    <h3>Total Income</h3>
                    <p>₹{summaryData.totalIncome.toLocaleString()}</p>
                  </div>
                  <div className="summary-card expense">
                    <h3>Total Expense</h3>
                    <p>₹{summaryData.totalExpense.toLocaleString()}</p>
                  </div>
                  <div className="summary-card balance">
                    <h3>Net Balance</h3>
                    <p>₹{(summaryData.totalIncome - summaryData.totalExpense).toLocaleString()}</p>
                  </div>
                </div>
              </section>
            )
          } />

          <Route path="/chart" element={
            dataLoaded && (
              <section className="chart-details">
                <h2>Category Pie Chart</h2>
                <div className="chart-wrapper">
                  <Pie data={generatePieChartData()} options={{ maintainAspectRatio: false }} />
                </div>
              </section>
            )
          } />

          <Route path="/lineChart" element={
            dataLoaded && (
              <section className="line-chart-details">
                <h2>Net Account Balance Line Graph</h2>
                <div className="chart-wrapper">
                  <Line key="lineChart" data={generateLineChartData()} options={{ maintainAspectRatio: false }} />
                </div>
              </section>
            )
          } />

          <Route path="/" element={
            <div className="home-container">
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
