import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from src.data_generator import generate_mock_data
from src.forecasting import train_predict, detect_anomalies, run_scenario
import os
from datetime import datetime, timedelta

# Page Configuration
st.set_page_config(
    page_title="CloudGuard | AI Cost Forecaster",
    page_icon="🛡️",
    layout="wide"
)

# Custom CSS for Premium Look
st.markdown("""
    <style>
    .main {
        background-color: #0e1117;
    }
    .stMetric {
        background-color: #1e2130;
        padding: 15px;
        border-radius: 10px;
        border-left: 5px solid #4CAF50;
    }
    .stAlert {
        border-radius: 10px;
    }
    </style>
    """, unsafe_allow_html=True)

# Application Heading
st.title("🛡️ CloudGuard: Smart Cloud Spending Forecasts")
st.markdown("---")

# Data Loading / Generation
DATA_PATH = 'data/aws_costs_mock.csv'

if not os.path.exists(DATA_PATH):
    with st.spinner("Initializing CloudGuard... Generating your first 6 months of cloud data."):
        df = generate_mock_data(DATA_PATH)
        st.success("Cloud data initialized!")
else:
    df = pd.read_csv(DATA_PATH)
    df['ds'] = pd.to_datetime(df['ds'])

# Sidebar Configuration
st.sidebar.header("🕹️ Control Center")
st.sidebar.markdown("Configure your forecasting parameters below.")

forecast_horizon = st.sidebar.slider("Forecast Horizon (Days)", 7, 30, 14)
confidence_level = st.sidebar.select_slider("Confidence Level", options=[0.80, 0.90, 0.95, 0.99], value=0.95)

st.sidebar.markdown("---")
st.sidebar.header("📈 Scenario Tester")
growth_rate = st.sidebar.slider("Projected Traffic Growth (%)", -50, 100, 0) / 100.0

# Core Processing
with st.spinner("Analyzing spending patterns and generating forecasts..."):
    # Baseline Model
    model, forecast = train_predict(df, periods=forecast_horizon, interval_width=confidence_level)
    
    # Anomaly Detection
    anomalies = detect_anomalies(df, forecast)
    
    # Scenario Modeling
    baseline_f, scenario_f = run_scenario(df, growth_rate)

# Layout: KPI Metrics
col1, col2, col3, col4 = st.columns(4)

current_val = df['y'].iloc[-1]
prev_val = df['y'].iloc[-2]
delta = ((current_val - prev_val) / prev_val) * 100

col1.metric("Recent Daily Cost", f"${current_val:,.2f}", f"{delta:+.1f}%")

total_month_so_far = df[df['ds'] > (datetime.now() - timedelta(days=30))]['y'].sum()
col2.metric("LTM Month-to-Date", f"${total_month_so_far:,.2f}")

forecast_end_val = forecast['yhat'].iloc[-1]
col3.metric("Projected Cost (Horizon End)", f"${forecast_end_val:,.2f}")

anomaly_count = len(anomalies[anomalies['ds'] > (datetime.now() - timedelta(days=14))])
col4.metric("Recent Anomalies (14d)", anomaly_count, delta_color="inverse" if anomaly_count > 0 else "normal")

# Tabs for visual separation
tab1, tab2, tab3 = st.tabs(["📊 Main Forecast", "🚨 Anomaly Report", "⚖️ Scenario Comparison"])

with tab1:
    st.subheader("Cloud Spending Forecast")
    
    fig = go.Figure()

    # Historical Data
    fig.add_trace(go.Scatter(
        x=df['ds'], y=df['y'],
        mode='lines',
        name='Actual Spending',
        line=dict(color='#00d1ff', width=2)
    ))

    # Forecast
    fig.add_trace(go.Scatter(
        x=forecast['ds'], y=forecast['yhat'],
        mode='lines',
        name='Predicted Baseline',
        line=dict(color='#4CAF50', width=2, dash='dot')
    ))

    # Uncertainty Area
    fig.add_trace(go.Scatter(
        x=pd.concat([forecast['ds'], forecast['ds'][::-1]]),
        y=pd.concat([forecast['yhat_upper'], forecast['yhat_lower'][::-1]]),
        fill='toself',
        fillcolor='rgba(76, 175, 80, 0.2)',
        line=dict(color='rgba(255,255,255,0)'),
        hoverinfo="skip",
        showlegend=False,
        name='Confidence Interval'
    ))

    fig.update_layout(
        template='plotly_dark',
        xaxis_title='Date',
        yaxis_title='Daily Cost ($)',
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=50, b=0),
        height=500
    )

    st.plotly_chart(fig, use_container_width=True)
    
    # Summary Text
    st.info(f"**Insight:** Based on the last 6 months, your daily costs are projected to reach **${forecast_end_val:,.2f}** in {forecast_horizon} days. The likely range stays between **${forecast['yhat_lower'].iloc[-1]:,.2f}** and **${forecast['yhat_upper'].iloc[-1]:,.2f}**.")

with tab2:
    st.subheader("Detected Spending Anomalies")
    if not anomalies.empty:
        st.warning(f"Total anomalies detected in history: {len(anomalies)}")
        
        # Display table
        display_df = anomalies[['ds', 'y', 'yhat', 'explanation']].copy()
        display_df.columns = ['Date', 'Actual Cost', 'Expected Range (Mid)', 'Description']
        st.dataframe(display_df.sort_values(by='Date', ascending=False), use_container_width=True)
        
        # Brief explanation for non-experts
        st.markdown("""
            **What are anomalies?**
            Points where spending falls outside the predicted 'normal' range (shaded green in the chart). 
            - **Spikes** often indicate unexpected resource usage, architectural changes, or untracked development spikes.
            - **Dips** might indicate service outages or successful cost-optimization efforts.
        """)
    else:
        st.success("No significant anomalies detected in your spending history!")

with tab3:
    st.subheader("Scenario Comparison: Baseline vs. Adjusted Growth")
    
    fig_comp = go.Figure()

    # Baseline Future
    fig_comp.add_trace(go.Scatter(
        x=baseline_f[baseline_f['ds'] > df['ds'].max()]['ds'],
        y=baseline_f[baseline_f['ds'] > df['ds'].max()]['yhat'],
        name='Baseline Projection',
        line=dict(color='#888', width=2)
    ))

    # Scenario Future
    fig_comp.add_trace(go.Scatter(
        x=scenario_f[scenario_f['ds'] > df['ds'].max()]['ds'],
        y=scenario_f[scenario_f['ds'] > df['ds'].max()]['yhat'],
        name=f'+{growth_rate*100:.0f}% Growth Scenario',
        line=dict(color='#ff4b4b', width=3)
    ))

    fig_comp.update_layout(
        template='plotly_dark',
        xaxis_title='Date',
        yaxis_title='Projected Daily Cost ($)',
        height=400
    )

    st.plotly_chart(fig_comp, use_container_width=True)
    
    # Comparative Metric
    impact = scenario_f['yhat'].iloc[-1] - baseline_f['yhat'].iloc[-1]
    st.write(f"**Outcome:** At the end of the {forecast_horizon}-day period, your new scenario would cost an additional **${impact:,.2f}** per day compared to the status quo.")

# Footer
st.markdown("---")
st.markdown("CloudGuard Prototype | Built for NatWest Hackathon")
