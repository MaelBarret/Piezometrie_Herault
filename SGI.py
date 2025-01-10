# https://pastas.readthedocs.io/latest/examples/standardized_groundwater_index.html
import matplotlib.pyplot as plt
import pandas as pd

import pastas as ps

from browser import document

document <= "Bonjour !"


ps.set_log_level("ERROR")
ps.show_versions()

# Load input data
head = pd.read_csv(
    "data/B32C0639001.csv", parse_dates=["date"], index_col="date"
).squeeze()
evap = pd.read_csv("data/evap_260.csv", index_col=0, parse_dates=[0]).squeeze()
rain = pd.read_csv("data/rain_260.csv", index_col=0, parse_dates=[0]).squeeze()

# Plot input data
ps.plots.series(head, [rain, evap]);

# Create the basic Pastas model
ml = ps.Model(head)
ml.add_noisemodel(ps.ArNoiseModel())

# Add a recharge model
rch = ps.rch.FlexModel()
rm = ps.RechargeModel(rain, evap, recharge=rch, rfunc=ps.Exponential(), name="rch")
ml.add_stressmodel(rm)

# Solve the model
ml.solve(tmin="1990", report=False)
ml.plots.results(figsize=(10, 6));

# Compute the SGI
sim = ml.simulate(tmin="1990")
sgi = ps.stats.sgi(sim.resample("W").mean())
ci = ml.solver.prediction_interval(n=10)

# Make the plot
fig, [ax1, ax2] = plt.subplots(2, 1, figsize=(10, 5), sharex=True)

# Upper subplot
sim.plot(ax=ax1, zorder=10)
ml.oseries.series.plot(ax=ax1, linestyle=" ", marker=".", color="k")
ax1.fill_between(ci.index, ci.iloc[:, 0], ci.iloc[:, 1], color="gray")
ax1.legend(["Simulation", "Observations", "Prediction interval"], ncol=3)

# Lower subplot
sgi.plot(ax=ax2, color="k")
ax2.axhline(0, linestyle="--", color="k")
droughts = sgi.to_numpy(copy=True)
droughts[droughts > 0] = 0
ax2.fill_between(sgi.index, 0, droughts, color="C0")

# Dress up the plot
ax1.set_ylabel("GWL [m]")
ax1.set_title("Groundwater levels")
ax2.set_ylabel("SGI [-]")
ax2.set_title("Standardized Groundwater Index")


# --------------------------------------------------------------------
# Loads heads and create Pastas model
# head2 = pd.read_csv("data/B32C0609001.csv", parse_dates=[0], index_col=0).squeeze()
# ml2 = ps.Model(head2)
# ml2.add_noisemodel(ps.ArNoiseModel())

# # Add a recharge model
# rch = ps.rch.FlexModel()
# rm = ps.RechargeModel(rain, evap, recharge=rch, rfunc=ps.Exponential(), name="rch")
# ml2.add_stressmodel(rm)

# # Solve and plot the model
# ml2.solve(tmin="1990", report=False)
# ml2.plots.results(figsize=(10, 6));

# # Add a linear trend
# tm = ps.LinearTrend("1990", "2020", name="trend")
# ml2.add_stressmodel(tm)

# # Solve the model
# ml2.del_noisemodel()
# # ml2.solve(tmin="1990", report=False)  # Get better initial estimated first
# ml2.add_noisemodel(ps.ArNoiseModel())
# ml2.solve(tmin="1990", report=False)
# ml2.plots.results(figsize=(10, 6));

# # Compute the SGI
# sim = ml2.simulate(tmin="1990")
# sgi = ps.stats.sgi(sim.resample("W").mean())
# ci = ml2.solver.prediction_interval(n=10)

# # Make the plot
# fig, [ax1, ax2] = plt.subplots(2, 1, figsize=(10, 5), sharex=True)

# # Upper subplot
# sim.plot(ax=ax1, zorder=10)
# ml2.oseries.series.plot(ax=ax1, linestyle=" ", marker=".", color="k")
# ax1.fill_between(ci.index, ci.iloc[:, 0], ci.iloc[:, 1], color="gray")
# ax1.legend(["Simulation", "Observations", "Prediction interval"], ncol=3)

# # Lower subplot
# sgi.plot(ax=ax2, color="k")
# ax2.axhline(0, linestyle="--", color="k")
# droughts = sgi.to_numpy(copy=True)
# droughts[droughts > 0] = 0
# ax2.fill_between(sgi.index, 0, droughts, color="C0")

# # Dress up the plot
# ax1.set_ylabel("GWL [m]")
# ax1.set_title("Groundwater levels")
# ax2.set_ylabel("SGI [-]")
# ax2.set_title("Standardized Groundwater Index");