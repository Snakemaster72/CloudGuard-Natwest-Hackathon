from prophet import Prophet
import pandas as pd
import numpy as np

def train_predict(df, periods=28, interval_width=0.95):
    """
    Trains a Prophet model on historical data and predicts future values.
    
    Args:
        df (pd.DataFrame): DataFrame with 'ds' and 'y' columns.
        periods (int): Number of days to forecast.
        interval_width (float): Confidence interval width (e.g., 0.95 for 95%).
        
    Returns:
        tuple: (fitted_model, forecast_df)
    """
    # Initialize and fit the model
    # We disable daily seasonality since we use daily data, but keep weekly and yearly
    model = Prophet(
        interval_width=interval_width,
        weekly_seasonality=True,
        daily_seasonality=False,
        yearly_seasonality=True
    )
    
    model.fit(df)
    
    # Create future dataframe
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)
    
    return model, forecast

def detect_anomalies(df, forecast):
    """
    Identifies anomalies by checking if actual values ('y') fall outside 
    the forecast's uncertainty bounds ('yhat_lower', 'yhat_upper').
    """
    # Merge historical data with forecast results
    performance = pd.merge(df, forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']], on='ds')
    
    # Anomaly condition
    performance['anomaly'] = np.where(
        (performance['y'] > performance['yhat_upper']) | 
        (performance['y'] < performance['yhat_lower']), 
        1, 0
    )
    
    # Filter only anomalies
    anomalies = performance[performance['anomaly'] == 1].copy()
    
    # Add simple explanations
    anomalies['explanation'] = anomalies.apply(
        lambda row: "Spending Spike" if row['y'] > row['yhat_upper'] else "Spending Dip", 
        axis=1
    )
    
    return anomalies

def run_scenario(df, growth_rate=0.0):
    """
    Adjusts the historical trend to simulate a 'what-if' scenario.
    Note: In a simple version, we just scale the future forecast by the growth rate.
    
    Args:
        df (pd.DataFrame): The original historical data.
        growth_rate (float): Percentage change (e.g., 0.1 for +10%).
        
    Returns:
        pd.DataFrame: Modified data for display.
    """
    # This is a simplified scenario runner
    model, baseline_forecast = train_predict(df)
    
    # Clone forecast for scenario
    scenario_forecast = baseline_forecast.copy()
    
    # Apply growth rate only to the future periods (rows where ds > max historical date)
    max_date = df['ds'].max()
    future_mask = scenario_forecast['ds'] > max_date
    
    scenario_forecast.loc[future_mask, 'yhat'] *= (1 + growth_rate)
    scenario_forecast.loc[future_mask, 'yhat_lower'] *= (1 + growth_rate)
    scenario_forecast.loc[future_mask, 'yhat_upper'] *= (1 + growth_rate)
    
    return baseline_forecast, scenario_forecast
