const socket = io();

socket.emit('games:mode_update', {
	mode : 'games'
});

var is_imu_connected = false;
var is_imu2_connected = false;
var update_counter = 0;

const annotation1 = {
  type: 'line',
  borderColor: 'black',
  borderWidth: 5,
  click: function({chart, element}) {
    console.log('Line annotation clicked');
  },
  label: {
    backgroundColor: 'red',
    content: 'Test Label',
    enabled: true
  },
  scaleID: 'y',
  value: 15
};

window.onload = function(){ 
	
	//*********************************//
	//** CHARTS CONFIGURATION  **//
	//*********************************//
	//var ctxalfa = document.getElementById('alfa_chart').getContext('2d');
	var ctximu1 = document.getElementById('beta_chart').getContext('2d');
	//var ctxgamma = document.getElementById('gamma_chart').getContext('2d');
	var ctximu2 = document.getElementById('beta2_chart').getContext('2d');

	// charts sizes:
	ctximu1.canvas.height = 340;
	ctximu2.canvas.height = 340;
	var commonOptions_IMU = {
		font: {
			size: 16
		},
		scales: {
			xAxes: [{
				type: 'time',
    			time: {
					parser: 'mm-ss-SSS',
        			tooltipFormat: 'HH:mm',
        			displayFormats: {
            			millisecond: 'mm:ss.SSS',
            			second: 'mm:ss',
            			minute: 'mm'
        			}
    			},
				scaleLabel: {
					fontSize: 18,
					display: true,
					labelString: 'Tiempo (s)'
				},
				ticks: {
					fontSize: 18,
					autoSkip: true,
					sampleSize: 5,
					maxRotation: 0,
					minRotation: 0
				}
			}],
			yAxes: [{
				ticks: {
                    //display: false,
					max: 30,    // maximum will be 70, unless there is a lower value.
					min: -20    // minimum will be -10, unless there is a lower value.  
				},
				scaleLabel: {
					display: true,
					labelString: 'Grados (º)'
				}
			}]
		},
		
		maintainAspectRatio: false,
		//showLines: false, // disable for a single dataset
		animation: {
			duration: 0 // general animation time
		},
		elements: {
			line: {
				tension: 0.1 // disables bezier curves
			},
			point:{
				radius: 0
			}
		}
	};
	
	var imu1_chart_instance = new Chart(ctximu1, {
		type: 'line',
		data: {
			datasets: [{label: 'FlexoExtensión',
				data: 0,
				fill: false,
				hidden: true,
				borderColor: '#FF2626',
				borderWidth: 1.5,
				pointBorderWidth: [],
				pointStyle: 'line'
			}]
		},
		options: Object.assign({}, commonOptions_IMU)		
	});
	var imu2_chart_instance = new Chart(ctximu2, {
		type: 'line',
		data: {
			datasets: [{label: 'FlexoExtensión',
				data: 0,
				fill: false,
				hidden: true,
				borderColor: '#FF2626',
				borderWidth: 1.5,
				pointBorderWidth: [],
				pointStyle: 'line'
			}]
		},
		options: Object.assign({}, commonOptions_IMU)		
	});
	
	
	
	/////////////////////////////////////////////////////////////
	/////////////////// INTERFACE INTERACTION ///////////////////
	/////////////////////////////////////////////////////////////
	
	document.getElementById("connect_imu").onclick = function() {
		// Start emg connection
		if (document.getElementById("connect_imu").value == "off") {
			document.getElementById("connect_imu").value = "connecting";
			document.getElementById("connect_imu").style.background = "#808080";
			document.getElementById("connect_imu").innerHTML = "Conectando...";
			socket.emit('pressure:connect_imu1');
			console.log("connnect")

		// Stop emg_connection
		} else if (document.getElementById("connect_imu").value == "on") {
			document.getElementById("connect_imu").value = "off";
			document.getElementById("connect_imu").innerHTML = "Conectar IMU";
			document.getElementById("connect_imu").style.background = "#4e73df";
			socket.emit('pressure:disconnect_imu1');

		} else if (document.getElementById("connect_imu").value == "connecting") {
			document.getElementById("connect_imu").value = "off";
			document.getElementById("connect_imu").innerHTML = "Conectar IMU";
			document.getElementById("connect_imu").style.background = "#4e73df";
			socket.emit('pressure:disconnect_imu1');
		}
	}	
	
	document.getElementById("connect_imu2").onclick = function() {
		// Start emg connection
		if (document.getElementById("connect_imu2").value == "off") {
			document.getElementById("connect_imu2").value = "connecting";
			document.getElementById("connect_imu2").style.background = "#808080";
			document.getElementById("connect_imu2").innerHTML = "Conectando...";
			socket.emit('pressure:connect_imu2');

		// Stop emg_connection
		} else if (document.getElementById("connect_imu2").value == "on") {
			document.getElementById("connect_imu2").value = "off";
			document.getElementById("connect_imu2").innerHTML = "Conectar Sensor De Presión";
			document.getElementById("connect_imu2").style.background = "#4e73df";
			socket.emit('pressure:disconnect_imu2');

		} else if (document.getElementById("connect_imu2").value == "connecting") {
			document.getElementById("connect_imu2").value = "off";
			document.getElementById("connect_imu2").innerHTML = "Conectar Sensor De Presión";
			document.getElementById("connect_imu2").style.background = "#4e73df";
			socket.emit('pressure:disconnect_imu2');
		}
	}	
	
	document.getElementById("record").onclick = function() {
		socket.emit('pressure:start');
		document.getElementById("record").disabled = true;
		document.getElementById("stop").disabled = false;
		
	}
	document.getElementById("stop").onclick = function() {
		socket.emit('pressure:stop');
		document.getElementById("record").disabled = false;
		document.getElementById("stop").disabled = true;
		document.getElementById("save").disabled = false;
		
	}
	document.getElementById("save").onclick = function() {
		socket.emit('pressure:download');
		document.getElementById("save").disabled = true;
		window.open('http://localhost:3000/downloadpressuresensor');
		
	}
	document.getElementById("calibrate").onclick = function() {
		socket.emit('pressure:calibrate');
		console.log("calibrate");		
	}
	
	/////////////////////////////////////////////////
	/////////// REAL-TIME VISUALIZATION /////////////
	/////////////////////////////////////////////////
	socket.on('pressure:connection_status', (data) => {
		let device= data.device;
		let status= data.status;
		console.log(data);
		if(device == 'imu1'){
			if (status==0){
				console.log("is con")
				//change button color and text;
				document.getElementById("connect_imu").value = "on";
				document.getElementById("connect_imu").innerHTML = "Desconectar IMU";
				document.getElementById("connect_imu").style.background = "#4eb14e";
				document.getElementById("calibrate").style.display = "block";
				is_imu_connected = true
				n = 1;
				const limitedInterval = setInterval(() => {
					if (n > 3){
						socket.emit('pressure:calibrate');	
						clearInterval(limitedInterval);	
					} 
					n++
					
				}, 1000)
				resetGraphs();

				if(is_imu2_connected){
					document.getElementById("record").disabled = false;
				}
				
				
				
			} else {
				console.log("error connection / disconnection")
				hideIMUDatasets();
				document.getElementById('calibrate').style.display = "none";
				//change button color and text;
				document.getElementById("connect_imu").value = "off";
				document.getElementById("connect_imu").innerHTML = "Conectar IMU";
				document.getElementById("connect_imu").style.background = "#4e73df";
				is_imu_connected = false;
				
				document.getElementById("record").disabled = true;
				document.getElementById("stop").disabled = true;
				document.getElementById("save").disabled = true;
				
				
			}

		} else if ( device == 'imu2'){
			if (status == 0){
				console.log("is con")
				//change button color and text;
				document.getElementById("connect_imu2").value = "on";
				document.getElementById("connect_imu2").innerHTML = "Desconectar IMU 2";
				document.getElementById("connect_imu2").style.background = "#4eb14e";
				is_imu2_connected = true;
				resetGraphs();
				if(is_imu2_connected){
					document.getElementById("record").disabled = false;
				}
				resetGraphs();
				
			} else {
				console.log("error connection")
				//change button color and text;
				document.getElementById("connect_imu2").value = "off";
				document.getElementById("connect_imu2").innerHTML = "Conectar IMU 2";
				document.getElementById("connect_imu2").style.background = "#4e73df";
				is_imu2_connected = false;
				
				document.getElementById("record").disabled = true;
				document.getElementById("stop").disabled = true;
				document.getElementById("save").disabled = true;
				
				hideIMUDatasets();
			}
		}
	});

	socket.on('pressure:data', (data) => {
		alfa = data.alfa;
		beta = data.beta;
		gamma = data.gamma;
		alfa2 = data.alfa2;
		beta2 = data.beta2;
		gamma2 = data.gamma2;
		
		
		// Update data label
		let segundos = Math.trunc(update_counter/10);
		let milisegundos = (update_counter/10*1000 - segundos*1000)
		let minutos = Math.trunc(segundos/60);
		segundos = segundos - minutos*60; 
		
		if(Math.trunc(milisegundos).toString().length == 1){
			milisegundos = '00' + milisegundos;
		} else if(Math.trunc(milisegundos).toString().length == 2){
			milisegundos = '0' + milisegundos;
		} else if(Math.trunc(milisegundos).toString().length == 0){
			milisegundos = '000';
		}

		let label = minutos + '-' + segundos + '-' + milisegundos;
		//console.log(label)
		if(is_imu_connected){
			//Update data value
			imu1_chart_instance.data.datasets[0].data.push(alfa);
			imu1_chart_instance.data.labels.push(label);
			
			if(update_counter > 49){
				// Remove first data value  in array
				imu1_chart_instance.data.datasets[0].data.shift();
				// Remove first data label in array
				imu1_chart_instance.data.labels.shift();
			}
			
		} else {
			imu1_chart_instance.data.labels = ['00:00', '00:01'];
		}
		
		if(is_imu2_connected){
			//Update data value
			imu2_chart_instance.data.datasets[0].data.push(alfa2);
			imu2_chart_instance.data.labels.push(label);
			
			if(update_counter > 49){
				// Remove first data value  in array
				imu2_chart_instance.data.datasets[0].data.shift();
				// Remove first data label in array
				imu2_chart_instance.data.labels.shift();
			}
			
		} else {
			imu2_chart_instance.data.labels = ['00:00', '00:01'];
		}
		
		update_counter ++
		
		imu1_chart_instance.update();
		imu2_chart_instance.update();
		
		

	});
	
	function resetGraphs(){
		update_counter = 0;
		
		if(is_imu_connected){
			imu1_chart_instance.data.datasets[0].data = [];
			imu1_chart_instance.data.labels = [];			
			// show data
			imu1_chart_instance.data.datasets[0].hidden = false;
		}
		if(is_imu2_connected){
			imu2_chart_instance.data.datasets[0].data = [];
			imu2_chart_instance.data.labels = [];			
			// show data
			imu2_chart_instance.data.datasets[0].hidden = false;
		}
	}
	
	function hideIMUDatasets(){
		imu1_chart_instance.data.datasets[0].hidden = true;
		imu2_chart_instance.data.datasets[0].hidden = true;

	}
	
	
	
}


