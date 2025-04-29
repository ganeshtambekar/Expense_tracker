import React, { useEffect, useState } from "react";
import moment from "moment";
import DoughnutChart from "./DoughnutChart";
import Popup from "../assets/popup.png";
import { Link, useNavigate } from "react-router-dom";
import { Segregator } from "../utilities/Categorysegregator";
import ReactTooltip from "react-tooltip";

let TotalSpent = 0;

export default function Home(props) {
  const navigate = useNavigate();
  const [totalBudget, setTotalBudget] = useState(0);
  const [tooltip, showTooltip] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [budgetPercentage, setBudgetPercentage] = useState(0);
  const [expenseData, SetExpenseData] = useState({
    datasets: [
      {
        label: "Expense",
        data: [],
        borderColor: "black",
        backgroundColor: [
          "rgba(255, 99, 132, 0.4)",
          "rgba(255, 159, 64, 0.4)",
          "rgba(255, 205, 86, 0.4)",
          "rgba(75, 192, 192, 0.4)",
          "rgba(54, 162, 235, 0.4)",
          "rgba(153, 102, 255, 0.4)",
          "rgba(201, 203, 207, 0.4)",
        ],
      },
    ],
    labels: [],
  });

  const [monthlyBudget, setMonthlyBudget] = useState({
    datasets: [
      {
        data: [],
        borderColor: "black",
        backgroundColor: ["#f87171", "#fbbf24"],
      },
    ],
  });

  // Function to send budget alert email
  const sendBudgetAlertEmail = async (percentage) => {
    try {
      const response = await fetch("send/sendBudgetAlert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budgetPercentage: percentage,
          totalSpent: TotalSpent,
          totalBudget: totalBudget
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmailSent(true);
        console.log("Budget alert email sent successfully");
      } else {
        console.error("Failed to send budget alert email:", data.error);
      }
    } catch (error) {
      console.error("Error sending budget alert email:", error);
    }
  };

  // Check budget threshold and send email if needed
  const checkBudgetThreshold = (percentage) => {
    // Only send email if budget is over 50% and email hasn't been sent yet
    if (percentage > 50 && !emailSent) {
      sendBudgetAlertEmail(percentage);
    }
  };

  useEffect(() => {
    const startDate = new Date();
    const date = {
      startdate: new Date(startDate.getFullYear(), startDate.getMonth(), 1).toDateString(),
      enddate: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1).toDateString(),
    };

    const getHomeChartdata = async () => {
      const res = await fetch("/expense/viewexpenseinrange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(date),
      });

      const data = await res.json();

      if (data.errors) {
        navigate("/");
      } else {
        const Segregated = Segregator(data.expense);
        TotalSpent = Segregated[1];
        SetExpenseData({
          datasets: [
            {
              label: "Expense",
              data: Object.values(Segregated[0]),
              backgroundColor: [
                "rgba(255, 99, 132, 0.4)",
                "rgba(255, 159, 64, 0.4)",
                "rgba(255, 205, 86, 0.4)",
                "rgba(75, 192, 192, 0.4)",
                "rgba(54, 162, 235, 0.4)",
                "rgba(153, 102, 255, 0.4)",
                "rgba(201, 203, 207, 0.4)",
              ],
              borderColor: [
                "rgb(255, 99, 132)",
                "rgb(255, 159, 64)",
                "rgb(255, 205, 86)",
                "rgb(75, 192, 192)",
                "rgb(54, 162, 235)",
                "rgb(153, 102, 255)",
                "rgb(201, 203, 207)",
              ],
              borderWidth: 1,
            },
          ],
          labels: Object.keys(Segregated[0]),
        });
      }
    };

    const handleGetBudget = async () => {
      const res = await fetch("/expense/getBudget");
      const data = await res.json();

      if (data.error || !data.budget || !data.budget.$numberDecimal) {
        return;
      }

      const budgetValue = parseFloat(data.budget.$numberDecimal);
      setTotalBudget(budgetValue);

      let remaining = budgetValue - TotalSpent;
      if (remaining < 0) remaining = 0;
      
      // Calculate budget percentage
      const percentage = budgetValue > 0 ? Math.floor((TotalSpent / budgetValue) * 100) : 0;
      setBudgetPercentage(percentage);
      
      // Check if we need to send a budget alert email
      checkBudgetThreshold(percentage);

      setMonthlyBudget({
        datasets: [
          {
            data: [TotalSpent, remaining],
            borderColor: "black",
            backgroundColor: ["#f87171", "#fbbf24"],
          },
        ],
      });
    };

    handleGetBudget();
    getHomeChartdata();
    
    // Reset emailSent state at the beginning of each month
    const today = new Date();
    if (today.getDate() === 1) {
      setEmailSent(false);
    }
    
  }, [navigate, emailSent]);

  return (
    <div className="lg:mt-10 mt-0 py-6 lg:py-0">
      <div className="lg:m-auto lg:ml-auto ml-4 lg:w-3/4 p-5 mx-8 rounded-md lg:mt-8 bg-rp-black text-slate-300">
        <div className="flex justify-between text-md">
          <p>spend in {moment().format("MMM 1")}-{moment().format("MMM D")}</p>
          <p className={budgetPercentage > 50 ? "text-red-400" : ""}>{budgetPercentage}% budget used</p>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex">
            <h3 className="text-sm">
              <span className="text-2xl">₹{TotalSpent}</span>/{totalBudget}
            </h3>
            <button
              onClick={props.openModalBudget}
              className="flex justify-center items-center hover:scale-110"
              data-tip="Set Budget"
              onMouseEnter={() => showTooltip(true)}
              onMouseLeave={() => {
                showTooltip(false);
                setTimeout(() => showTooltip(true), 50);
              }}
            >
              <span className="inline-block mt-2 cursor-pointer">
                <img className="ml-2 w-5" src={Popup} alt="Set Budget" />
              </span>
            </button>
            {tooltip && <ReactTooltip place="bottom" type="dark" effect="solid" />}
          </div>
          <div className="w-9">
            <DoughnutChart chartData={monthlyBudget} />
          </div>
        </div>
        {budgetPercentage > 50 && (
          <div className="mt-2 text-red-400 text-sm">
            Budget usage alert: You've used more than 50% of your monthly budget
            {emailSent && " (Alert email sent)"}
          </div>
        )}
      </div>

      <div className="bg-rp-black rounded-md lg:p-5 p-3 lg:m-auto lg:mt-4 mt-4 lg:w-3/4 mx-6 ml-3 cursor-pointer">
        <DoughnutChart chartData={expenseData} />
      </div>

      <Link to="dailyspendanalysis">
        <div className="w-3/4 m-auto p-4 mt-7 rounded-md bg-rp-black hover:bg-mj-black text-slate-300 lg:block hidden">
          <h1 className="flex text-2xl w-fit m-auto">
            <span className="mr-3 text-jp-yellow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </span>
            Spend Analysis
          </h1>
        </div>
      </Link>
    </div>
  );
}