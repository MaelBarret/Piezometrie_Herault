import json
import requests

bss = '10161X0202/ALG130'

def donnees_piezo(bss):
	# jsondata = ()
	processed_json = ()
	# if size > 40000:
	# 	size = 40000
	# sizereq = size
	# if size > 20000:
	# 	sizereq = 20000
	urlobs = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss=" + bss + "&size=" + sizereq + "&fields=date_mesure,profondeur_nappe&sort=desc"
	print(urlobs)
	urlobs += '&date_debut_mesure='# + resdeb
	async def Req(result):
		rep = json.loads(result)
		jsondata = rep.data
		nbmes = jsondata.length
		print (nbmes)
		if nbmes > 0:  
			for key in jsondata:
				dat = jsondata[key]['date_mesure']
				dat = Date.parse(dat)
				niv = jsondata[key]['profondeur_nappe'];
				processed_json.push([dat, niv])
			count = rep.data.count
			if count > 20000:# & size > 20000:
				# if count > size:
				# 	count = size
				url2 = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss=" + bss + "&size=" + (size-20000) + "&fields=date_mesure,profondeur_nappe&sort=desc&date_fin_mesure=" + jsondata[19999]['date_mesure']; 
				url2 += '&date_debut_mesure='# + resdeb;
				
				rep2 = json.loads(ajaxGet(url2))
				data2 = rep2.data
				for i in data2:
					dat = data2[i]['date_mesure']
					dat = Date.parse(dat)
					niv = data2[i]['profondeur_nappe']
					processed_json.push([dat, niv])
				
				nbmes = processed_json.length
			print(processed_json)
			# processed_json.sort(function(a,b):  
			# 	return a[0]-b[0])
			
			dernier_resultat = processed_json[nbmes-1][1]
			if dernier_resultat < 0:
				dernier_resultat = 0
			date_max = Date(processed_json[nbmes-1][0])
			return processed_json


test = donnees_piezo(bss)
print(test)


# # https://pastas.readthedocs.io/latest/examples/standardized_groundwater_index.html
# import matplotlib.pyplot as plt
# import pandas as pd

# import pastas as ps
# # Load input data
# head = pd.read_csv(
#     "data/B32C0639001.csv", parse_dates=["date"], index_col="date"
# ).squeeze()
# evap = pd.read_csv("data/evap_260.csv", index_col=0, parse_dates=[0]).squeeze()
# rain = pd.read_csv("data/rain_260.csv", index_col=0, parse_dates=[0]).squeeze()

# # Plot input data
# ps.plots.series(head, [rain, evap]);

# # Create the basic Pastas model
# ml = ps.Model(head)
# ml.add_noisemodel(ps.ArNoiseModel())

# # Add a recharge model
# rch = ps.rch.FlexModel()
# rm = ps.RechargeModel(rain, evap, recharge=rch, rfunc=ps.Exponential(), name="rch")
# ml.add_stressmodel(rm)

# # Solve the model
# ml.solve(tmin="1990", report=False)
# ml.plots.results(figsize=(10, 6));

# # Compute the SGI
# sim = ml.simulate(tmin="1990")
# sgi = ps.stats.sgi(sim.resample("W").mean())
# ci = ml.solver.prediction_interval(n=10)

# # Make the plot
# fig, [ax1, ax2] = plt.subplots(2, 1, figsize=(10, 5), sharex=True)

# # Upper subplot
# sim.plot(ax=ax1, zorder=10)
# ml.oseries.series.plot(ax=ax1, linestyle=" ", marker=".", color="k")
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
# ax2.set_title("Standardized Groundwater Index")