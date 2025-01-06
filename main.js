// Initializes map
const map = new L.map('map').setView([43.58,3.367], 10);

var basemaps = {
	OSM : L.tileLayer("http://{s}.tile.osm.org/{z}/{x}/{y}.png"),
	// OpenTopoMap : L.tileLayer("http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"),
};

L.control.layers(basemaps).addTo(map);
basemaps.OSM.addTo(map);
// Add layer to the map
dm =  document.getElementById('map'); 

let markersLayer;
let popup;
// *** variables globales ***
	slong = 'longitude';
	slat = 'latitude';
	scode = 'code_bss';
	slib = 'nompe';
	smeau = 'lisa'; // on va écrire l'entité bdlisa à la place de la masse d'eau
	snbmes = 'nbmes'; // nom du champ dans le fichier station pour le nb de données/mesures/analyses. Peut ne pas exister ('')
	sdatefin = 'datefin';   // nom du champ dans le fichier station pour la date de fin. Permet de n'afficher que les stations qui dont des données postérieures à date passé en paramètre. Peut ne pas exister ('')
	sdatedeb = 'datedeb';   // nom du champ dans le fichier station pour la date de fin. Permet de n'afficher que les stations qui dont des données postérieures à date passé en paramètre. Peut ne pas exister ('')
	snat = 'natpe'; // nom du champ dans le fichier station pour la nature (permet de discriminer l'affichage des stations par couleur ou présence/absence). Peut ne pas exister ('')
	sparam = ''; 
	sres = 'profmax'; // nom du champ dans le fichier station pour le résultat max (permet de discriminer l'affichage des stations par seuil de résultat). Peut ne pas exister ('')
	sunit = ''; // nom du champ unité dans la réponse hubeau
	iconfile = 'pointOr_on.png'; // l'image 'iconPiezo.svg' met trop de temps à charger quand beaucoup d'éléments et nécessiterait clustering
	iconscale = 15;
	icony = 0; // 32
	fdp = 'esri_topo3';
	fp1 = true; fp2 = true; fp3 = true; fp4 = false; fp5 = true; fp6 = true; fp7 = true;
	size = 40000; // 2022-08-02 changé de 20000 à 40000 car une station a 20304 mesures. Nécessité de changer le traitement dans donnees_piezo
	// tableaux pour rangeSelector de la fonction graphique()
	ty = ['month', 'year', 'year', 'year'];
	co = [3, 1, 5, 10];
	te = ['3 mois', '1 an', '5 ans', '10 ans'];
	down_img_top = 278+30-75; // position de arrowdown pour gérer affichage graphique +30 pour possibilité station+nappe sur 3 lignes -75 suppression Contact
	ajout = 100000; // pour afficher 5 chiffres dans odometer dont 1 décimale
	station_layer_name_URL = 'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?code_departement=34&format=json'; // nom du fichier des stations
	station_layer_type = 'json'; // json ou geojson
	setat = "points d'eau"; // 2021-08-26 phrase qui doit apparaître dans la ligne d'état
// **************************

grandeur = "piezo"; // pour éviter erreur dans les tooltips
seuil = 0;
station_layer(false); 

function donnees_piezo(bss) {
		// il y a des valeurs abberantes égales à 10020.4
		// Pb aussi pour source 08612X0201/LZG122 avec des valeurs >1270 (doivent être négatives) et 08617X0211/LZG248
		jsondata = new Array();
		processed_json = new Array();  
		if (size > 40000) { size = 40000; }
		sizereq = size;
		if (size > 20000) { sizereq = 20000; }
		urlobs = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss=" + bss + "&size=" + sizereq + "&fields=date_mesure,profondeur_nappe&sort=desc"; // 2022-08-02 sort=desc pour pouvoir ne tracer que les size dernières mesures
		console.log(urlobs)
		if (typeof(resdeb) !== 'undefined') { // 2022-08-02 prise en compte date de début des résultats
			urlobs += '&date_debut_mesure=' + resdeb;
		}
		asyncReq(function(result) {
			var rep = JSON.parse(result); 
			jsondata = rep.data;
			nbmes = jsondata.length;
			if (nbmes > 0) { 
				for(var key in jsondata) {
					dat = jsondata[key]['date_mesure'];
					dat = Date.parse(dat);
					niv = jsondata[key]['profondeur_nappe']; 
					processed_json.push([dat, niv]);
				}
				// 2022-08-02 traitement quand plus de 20000 mesures (appel synchrone)	
				count = rep.data.count;
				if (count > 20000 && size > 20000) {
					if (count > size) { count = size; }
					// il faut récupérer les count-20000 enregs restants
					url2 = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss=" + bss + "&size=" + (size-20000) + "&fields=date_mesure,profondeur_nappe&sort=desc&date_fin_mesure=" + jsondata[19999]['date_mesure']; 
					if (typeof(resdeb) !== 'undefined') { // 2022-08-02 prise en compte date de début des résultats
						url2 += '&date_debut_mesure=' + resdeb;
					}
					var rep2 = JSON.parse(ajaxGet(url2)); 
					data2 = rep2.data;
					for(var i in data2) {
						dat = data2[i]['date_mesure'];
						dat = Date.parse(dat);
						niv = data2[i]['profondeur_nappe']; 
						processed_json.push([dat, niv]);
					}
					nbmes = processed_json.length; 	
				}	
				processed_json.sort(function(a,b) { // ajout 2021-08-04 pour ne plus avoir le warning https://assets.highcharts.com/errors/15/ et avoir le navigator correct
					return a[0]-b[0]
				});
				dernier_resultat = processed_json[nbmes-1][1];
				if (dernier_resultat < 0) { dernier_resultat = 0; } // 2021-08-25 pour prendre en compte piézos artésiens (copié de piezo_tr.js)
				date_max = new Date(processed_json[nbmes-1][0]);
				return processed_json;
			}
		});	
}	

// Fonction de récupération des paramètres GET de la page. @return Array Tableau associatif contenant les paramètres GET
function extractUrlParams(){	
	var t = location.search.substring(1).split('&');
	var f = [];
	for (var i=0; i<t.length; i++){
		var x = t[ i ].split('=');
		f[x[0]]=x[1];
	}
	return f;
}	

// remplace toutes les occurences d'une chaine contrairement à la méthode string.replace()
function replaceAll(recherche, remplacement, chaineAModifier) {
	return chaineAModifier.split(recherche).join(remplacement);
}

function station_layer(bdata=false) {	
	// si bdata= true, c'est une requête Hub'Eau qui est envoyée, il faut interroger response.data
	var request = new XMLHttpRequest();
	request.open('GET', station_layer_name_URL);
	request.responseType = 'json';
	request.send();
	request.onload = function() {
	  if (bdata) {
		rep = request.response.data;
	  } else {
		rep = request.response;
	  }	  
	  f = extractUrlParams();
	  create_layer_station();
	  carte_commun();
	}
}

// urlobs = variable globale contenant l'URL pour appeler les observations
function asyncReq(callback) {
	var httpRequest = new XMLHttpRequest();
    httpRequest.onload = function(){ // when the request is loaded
       callback(httpRequest.responseText);// we're calling our method
    };
    httpRequest.open('GET', urlobs);
    httpRequest.send();
}

// Appel AJAX synchrone
function ajaxGet(url) {
    var req = new XMLHttpRequest();
    req.open("GET", url, false);
    req.send(null);
    if (req.status >= 200 && req.status < 400) {
            return req.responseText;
    } else {
            console.error(req.status + " " + req.statusText + " " + url);
    }
}

// Exécute un appel AJAX GET asynchrone
// Prend en paramètres l'URL cible et la fonction callback appelée en cas de succès
function ajaxGetAsync(url, callback) {
    var req = new XMLHttpRequest();
    req.open("GET", url);
    req.addEventListener("load", function () {
        if (req.status >= 200 && req.status < 400) {
            // Appelle la fonction callback en lui passant la réponse de la requête
            callback(req.responseText);
        } else {
            console.error(req.status + " " + req.statusText + " " + url);
        }
    });
    req.addEventListener("error", function () {
        console.error("Erreur réseau avec l'URL " + url);
    });
    req.send(null);
}

function get_adresse(){
		var adrval = document.getElementById("adresse").value;
		var url = "https://api-adresse.data.gouv.fr/search/?q=" + adrval + "&limit=1"; 
		var rep = JSON.parse(ajaxGet(url)); 
		if (rep.data.features[0]) {
			//long = rep.data.features[0].geometry.coordinates[0];
			//lat = rep.data.features[0].geometry.coordinates[1];
			coord = rep.data.features[0].geometry.coordinates;
			var coordinate = ol.proj.fromLonLat(coord);
			AdrFeature.getGeometry().setCoordinates(coordinate);
			//AdrFeature.setStyle(iconAdrStyle);
			map.getView().setCenter(coordinate);
			map.getView().setZoom(12);   // 2021-07-28 passage de 11 à 12 pour zoomer plus près
		}	else {
			AdrFeature.setStyle(iconInvisibleStyle);
		}	
}

function convertDateTimeISO(s) { 
	// convertit une date ISO (2019-07-10T02:05:20Z) en date/time usuelle (10/07/2019 02:05:20)
	return(s.substring(8, 10) + '/' + s.substring(5, 7) + '/' + s.substring(0, 4) + ' ' + s.substring(11, 13) + ':' + s.substring(14, 16) + ':' + s.substring(17, 19));
}

function convertDateISO(s) { 
	// convertit une date ISO (2019-07-10T00:00:00Z) en date usuelle (10/07/2019)
	return(s.substring(8, 10) + '/' + s.substring(5, 7) + '/' + s.substring(0, 4));
}

function convertMoisISO(s) { 
	// convertit une date ISO (2019-07-10T02:05:20Z) en mois/année(07/2019). Utilisé par qmm
	return(s.substring(5, 7) + '/' + s.substring(0, 4));
}

function convertAnneeISO(s) { 
	return(s.substring(0, 4));
}

function traitement_unite(bmetres) {
	// bmetres : true si on affiche les unités après odometer
	unite = jsondata[0][sunit];
	switch (unite) {
	  case '°C':
		symb = '°C'; 
		syaxis = 'Température (°C)';
		break;
	  case '°f': case '°F':
		symb = '°f'; 
		syaxis = 'Dureté (°f)';
		break;
	  case 'gramme par kilogramme':
		symb = 'g/kg'; 
		syaxis = 'Concentration (g/kg)';
		break;
	  case 'milligramme par kilogramme': case 'mg/(kg MS)': case 'mg(Hg)/kg': case 'mg(Cr)/kg': case 'mg(Pb)/kg':
		symb = 'mg/kg'; 
		syaxis = 'Concentration (mg/kg)';
		break;
	  case 'microgramme par kilogramme': case 'µg/(kg MS)':	
		symb = 'µg/kg'; 
		syaxis = 'Concentration (µg/kg)';
		break;
	  case 'milligramme par litre':
	  case 'mg/L': case 'mg(Ca)/L': case 'mg(Cl)/L': case 'mg(Mg)/L': case 'mg(K)/L': case 'mg(Na)/L': case 'mg(N)/L':
	  case 'mg(NH4)/L': case 'mg(NO2)/L': case 'mg(NO3)/L': case 'mg(O2)/L':
	  case 'mg(P)/L': case 'mg(PO4)/L': case 'mg(P2O5)/L': case 'mg(SO4)/L':
		symb = 'mg/l'; 
		syaxis = 'Teneur (mg/l)';
		break;
	  case 'microgramme par litre': case 'µg/L': case 'µg(Cd)/L': case 'µg(Cu)/L': case 'µg(Ni)/L': case 'µg(Pb)/L': case 'µg(Zn)/L': case 'µg(Cr)/L': case 'µg(Hg)/L': case 'µg(As)/L':
	  case 'µg(B)/L': case 'µg(Se)/L': case 'µg(Fe)/L': case 'µg(Co)/L': case 'µg(Mo)/L': case 'µg(Mn)/L': case 'µg(Al)/L': case 'µg(Ag)/L': case 'µg(Ba)/L': case 'µg(Be)/L': case 'µg(Sn)/L': case 'µg(Ti)/L': case 'µg(V)/L':
		symb = 'µg/l'; 
		syaxis = 'Teneur (µg/l)';
		break;
	  case 'nanogramme par litre':
		symb = 'ng/l'; 
		syaxis = 'Teneur (ng/l)';
		break;
	  case 'pourcentage':
	  case '%':
		symb = '%';
		syaxis = 'Taux (%)';
		break;
	  case 'unité pH':
		symb = 'unité pH'; 
		syaxis = 'pH (unité pH)';
		break;
	  case 'µS/cm':
		symb = 'µS/cm'; 
		syaxis = 'Conductivité (µS/cm)';
		break;
	  case 'NFU': case 'NTU':
		symb = 'NFU'; 
		syaxis = 'Turbidité (NFU)';
		break;
	  case 'X': case 'n': case '‰ vs SMOW': case 'Unité inconnue': case 'unité inconnue':
		// prendre valeur max dans fichier paramètre
		if (typeof(valmax[grandeur]) !== 'undefined') { 
			symb = ' / ' + valmax[grandeur]; 
			syaxis = 'Valeur (/' + valmax[grandeur] + ')';
		} else {
			symb = '?';
			syaxis = '?';
		}	
		break;
	  default:
		symb = '?';
		syaxis = '?';
	}	
	if (bmetres) { document.getElementsByClassName("metres")[0].innerHTML = '&nbsp;' + symb; }
	console.log('unité = ' + unite);
}

function addPiezoToMap() {
		x = rep.data[ipt]["x"];
		y = rep.data[ipt]["y"];
		bss = rep.data[ipt][scode];
		commune = rep.data[ipt]["nom_commune"];
		markersLayer = L.featureGroup();
		if (rep.data[ipt]["nb_mesures_piezo"] != 0){
			// switch (a=b) {
			// 	case 1: a=a;break;
			// };
			markerPiezoFeature[ipt] = L.marker([y,x]);
			markerPiezoFeature[ipt].bss = bss;
			markerPiezoFeature[ipt].commune = commune;
			markerPiezoFeature[ipt].addTo(markersLayer);
			markerPiezoFeature[ipt].on('click', async function(){
				donnees_piezo(this.bss);
				const delay = ms => new Promise(res => setTimeout(res, ms));
				await delay(1000);
				this.bindPopup(function (layer) {
						let canvas = document.createElement('div');
						Highcharts.setOptions({	lang: {locale: 'fr'}});
						myChart = Highcharts.stockChart(canvas, {
						chart: {
								type: 'scatter', /* 'scatter' pour avoir tooltip */
								backgroundColor: {
									linearGradient: [0, 0, 500, 500],
									stops: [
										[0, 'rgb(255, 255, 255)'],
										[1, 'rgb(240, 241, 252)']
									]
								},
								borderColor: '#EBBA95',
								borderWidth: 0,
								marginRight: 20				
							},
						plotOptions: {
							column: {
								pointPadding: 0.2,
								borderWidth: 0,
								groupPadding: 0,
								color: '#0000FF',
								shadow: false
							},
							scatter: {
								lineWidth: 1, 
								marker: {
									radius: 3,
									enabled: false
								},
							}
						},
						tooltip: {
							useHTML: true,
							formatter: function() {
								// 2022-08-01 cas particulier QmM et prel - sale mais fonctionne
								switch (grandeur) {
									case 'QmM': 
										return Highcharts.dateFormat('%b %Y', this.x+86400000) +' : <b>'+ Highcharts.numberFormat(this.y,2,'.',' ') +'</b> m3/s'; // 86400000 pour ajouter 1 jour et afficher le bon mois
										break
									case 'prel': 
										return Highcharts.dateFormat('%Y', this.x+86400000) +' : <b>'+ Highcharts.numberFormat(this.y,0,'.',' ') +'</b> m3'; // 86400000 pour ajouter 1 jour et afficher la bonne année
										break
									default : 
										// if (ttnbdec == -1) {
											return '<u>' + this.series.name + '</u><br>le '+ Highcharts.dateFormat('%e %b %Y', this.x) +' : <b>'+ this.y +'</b> ' + 'm'; 
										// } else {	
											// return '<u>' + this.series.name + '</u><br>le '+ Highcharts.dateFormat(sttformat, this.x) +' : <b>'+ Highcharts.numberFormat(this.y,ttnbdec,'.',' ') +'</b> ' + sttunit; 
										// }	
								};	
								/*	
								if (grandeur == 'QmM') {
									return Highcharts.dateFormat('%b %Y', this.x+86400000) +' : <b>'+ Highcharts.numberFormat(this.y,2,'.',' ') +'</b> m3/s'; // 86400000 pour ajouter 1 jour et afficher le bon mois
								} else {	
									if (ttnbdec == -1) {
										return '<u>' + this.series.name + '</u><br>le '+ Highcharts.dateFormat(sttformat, this.x) +' : <b>'+ this.y +'</b> ' + sttunit; 
									} else {	
										return '<u>' + this.series.name + '</u><br>le '+ Highcharts.dateFormat(sttformat, this.x) +' : <b>'+ Highcharts.numberFormat(this.y,ttnbdec,'.',' ') +'</b> ' + sttunit; 
									}	
								} */	
							},
							shared: false //true
							//xDateFormat: '%Y-%m-%d',
							//valueDecimals: 2
						},
						legend: {
							backgroundColor: '#FFFFFF',
							enabled: false,
							verticalAlign: 'top',
							y: -73, //70,
							align: 'center', //'left',
							backgroundColor: 'lightgray',
							borderColor: 'black',
							borderWidth: 1,
							layout: 'horizontal', //'vertical',
							shadow: true
						},
						scrollbar: {
							enabled: true
						},
						navigator: {
							margin: 10,
							height: 30,
							enabled: true
						},
						rangeSelector: {
						inputEnabled: true,
						floating: true,
						dropdown: 'always',
						buttonPosition: {
							x: -60, //-30
							y: -37  //-35
						},	  
						buttons: [{
							type: ty[0],
							count: co[0],
							text: te[0]
							}, {
							type: ty[1],
							count: co[1],
							text: te[1]
							}, {
							type: ty[2],
							count: co[2],
							text: te[2]
							}, {
							type: ty[3],
							count: co[3],
							text: te[3]
							}, {
							type: 'all',
							text: 'Tout'
						}]
						},
						title: {
							text: "Profondeur de la nappe à " + layer.commune + ' (' + '<a href=https://ades.eaufrance.fr/Fiche/PtEau?Code='+layer.bss+' target="_blank">'+layer.bss+'</a>'+')',
							style: {
								color: '#333333',
								fontSize: '12px'
							},
							useHTML: true
						},
						xAxis: {
							type: 'datetime',
							labels:{format: '{value:%e %b %Y}'},
							visible: true
						},
						yAxis: [{
							reversed: false,
							opposite: false,
							title: {
								enabled: true,
								text: "Profondeur (en m)",
								style: {
									fontWeight: 'normal'
								}
							},
							labels: {
								align: 'right'
							}
						}],	
						series: [{
								name: bss,
								// colorIndex: coul,
								yAxis: 0,
								fillColor: {
									linearGradient: {
										x1: 0,
										y1: 1,
										x2: 0,
										y2: 0 
									},
									stops: [
										[0, Highcharts.getOptions().colors[0]],
										[1, Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
									]
								},
								data: processed_json
						}]
					});
						return canvas;		
				}).addTo(map);
				this.openPopup();
		});
		markersLayer.addTo(map);}
		// if (feat.get('ipt')) { // affichage de la bonne couleur du symbole dans le titre de la station
		// 	switch (rep[feat.get('ipt')][snat].toLowerCase()) {
		// 		case 'forage': scou = 'Or'; break;
		// 		case 'source': scou = 'Bleu'; break;
		// 		case 'puits': scou = 'Mauve'; break;
		// 		case 'inconnue': scou = 'Gris'; break;
		// 	}
		// bnat = true; // 2021-08-17 paramètre général nature : permet de n'afficher que les stations d'une nature spécifique
		// if ((typeof(snat) !== 'undefined') && (snat != '') && (nature != '') && (typeof(rep.data[ipt][snat]) !== 'undefined')) { // traitement nature
		// 	nat = rep.data[ipt][snat].toLowerCase();  
		// 	if (nature.indexOf(nat) == -1) { bnat = false; } // si la nature du point n'est pas trouvée dans la chaîne nature, on n'affiche pas le point
		// }
}

function create_layer_station() { 
	tabbss = new Array(); // 2021-08-27 tableau des codes stations indiquant le n° d'ordre ipt
	nbanamin = 0; // 2021-08-16 nbanamin ajouté comme paramètre général. Il faut que le jeu de données des stations comporte un champ nb de données/mesures/analyses. 
	// 2021-08-24 nom du paramètre changé en nbobsmin pour être mieux représentatif des données de tous les démonstrateurs
	if ((typeof(f['nbobsmin']) !== 'undefined') && (snbmes != '')) { 
		if (f['nbobsmin'] > 0) {
			nbanamin = f['nbobsmin'];
			if (typeof(document.getElementById("val6")) !== 'undefined') { 
				document.getElementById("val6").value = nbanamin;
			}
		}	
	}	

	datefin = '';
	datedeb = '';
	// TODO : afficher sélecteur pour choisir année interactivement ou mieux sélecteur qui propose tous les paramètres : nbobsmin, datedeb, datefin, coord, code_station. Plus convivial et permet de ne pas recharger la page à chaque fois
	if ((typeof(f['datefin']) !== 'undefined') && (typeof(sdatefin) !== 'undefined') && (sdatefin != '')) {  // 2021-08-24 datefin ajouté comme paramètre général pour n'afficher que les stations qui ont des données postérieures à datefin. 
	// sdatefin doit être défini dans le démonstrateur appelant.
		// tester validité date (format YYYY-MM-DD ou YYYY-MM ou YYYY)
		datefin = f['datefin'];
		if (typeof(document.getElementById("val4")) !== 'undefined') { 
			document.getElementById("val4").value = datefin;
		}
	}

	if ((typeof(f['datedeb']) !== 'undefined') && (typeof(sdatedeb) !== 'undefined')  && (sdatedeb != '')) {  // 2021-08-24 datedeb ajouté comme paramètre général pour n'afficher que les stations qui ont des données antérieures à datedeb. 
	// sdatedeb doit être défini dans le démonstrateur appelant.
		datedeb = f['datedeb'];
		if (typeof(document.getElementById("val3")) !== 'undefined') { 
			document.getElementById("val3").value = datedeb;
		}
	}
	
	// if ((typeof(snat) !== 'undefined') && (snat != '')) { // 2021-08-17 il y a un traitement de nature (type de station). Appeler la procédure spécifique à chaque démonstrateur le prenant en charge
	// // init_nat();
	// }

	if (typeof(f['seuil']) !== 'undefined') { // 2022-08-01
		seuil = f['seuil'];
	}

	if (station_layer_type != 'geojson') {
		markerPiezoFeature = new Array();
		// markerSource = new ol.source.Vector({
		// });
		for (ipt = 0; ipt < rep.data.length; ipt++) {
			tabbss[rep.data[ipt][scode]] = ipt;
			addPiezoToMap();
		}
		markersLayer.on('click', e => {
			traitement_station(bss)
		});
		if (document.getElementById("etat")) { 
			document.getElementById("etat").innerHTML = markerSource.getFeatures().length + ' ' + setat;
		} 
	} 
}

function carte_commun() {
	// iconfile = nom du fichier contenant le picto à afficher pour les stations (doit être dans le sous-répertoire images. ex : 'Hydrometrie.svg' ou 'iconPiezo.svg'
	// iconscale = facteur d'échelle pour l'icône des stations (15 pour la plupart des démonstrateurs, 6 pour hydro_tr). La taille maxi du symbole sera iconscale/12.
	if (typeof(f['size']) !== 'undefined') { 
		if (!isNaN(f['size'])) {
			size = f['size']; // nb de données à récupérer dans la réponse hub'eau
		}	
		if (size > 20000 && grandeur != 'piezo') { size = 20000; }
	}
	
	blimit = false; // 2021-08-24 paramètre GET limit=1, true, oui, o ou yes pour tracer limite ou ref de qualité sur graphique
	// pour eso : https://www.legifrance.gouv.fr/loda/id/LEGIARTI000032789885/2016-06-27/
	// NQE esu : https://substances.ineris.fr/fr/substance/getDocument/3490 et https://aida.ineris.fr/consultation_document/4159 + normes eau potable https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000465574/
	// arrêté 2018 : https://www.legifrance.gouv.fr/download/file/vnWMBApAUzS-98Ro7fb1RlsDFihSq-tW46KWa2ISZzs=/JOE_TEXTE
	if (typeof(f['limit']) !== 'undefined') { 
		if ((f['limit'].toLowerCase() == 'oui') || (f['limit'].toLowerCase() == 'yes') || (f['limit'].toLowerCase() == 'true') || (f['limit'].toLowerCase() == '1') || (f['limit'].toLowerCase() == 'o')) {
			blimit = true;
		}	
	}

	// 2022-08-02 prise en compte du paramètre GET resdeb : date de début de la récupération des données et du tracé des graphiques
	if (typeof(f['resdeb']) !== 'undefined') { 
		resdeb = f['resdeb'];
	}

	classbss = document.getElementById("station"); // id était "bss" avant dans .htm
	classlibpe = document.getElementById("libpe");
	classcode = document.getElementById("code");	
	
	//https://www.developpez.net/forums/d1670841/applications/sig-systeme-d-information-geographique/ign-api-geoportail/affichage-popups-l-extension-openlayers/
	// chronique_url = 'http://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss='	

	if (typeof(f['code_station']) !== 'undefined') { 
		// il y a un paramètre code_station dans l'URL
		bss = f['code_station'];

		if (typeof(tabbss[bss]) !== 'undefined') { // ne fonctionnera pas avec geojson qui ne passe pas par rep
			ipt = tabbss[bss];  
			if (typeof(markerPiezoFeature[ipt]) === 'undefined') { // la station existe mais n'est pas dans la source à cause d'autres critères (nature, nbobsmin, datedeb, datefin). L'ajouter sinon erreur
				x = rep.data[ipt][slong];
				y = rep.data[ipt][slat];
				markerPiezoFeature[ipt] = new ol.Feature({
					geometry: new ol.geom.Point(ol.proj.fromLonLat([x, y]))
				});
				markerPiezoFeature[ipt].set(scode, rep.data[ipt][scode]); 
				markerPiezoFeature[ipt].set(slib, rep.data[ipt][slib]);
				markerPiezoFeature[ipt].set(smeau, rep.data[ipt][smeau]);
				markerPiezoFeature[ipt].set('ipt', ipt); 
				markerSource.addFeature(markerPiezoFeature[ipt]);
			}	
			feat = markerPiezoFeature[ipt]; // n'existe pas si la station n'est pas de la nature passée en paramètre

			// traitement_station();
		}	
	}
}