

const path = require('path'); // Modulo de nodejs para trabajar con rutas
const express = require('express'); // Configurar express
const fs = require('fs'); //  File System module
const net = require('net');
const SocketIO = require('socket.io');
const ExcelJS = require('exceljs');
const matrix = require('node-matrix');

const BluetoothClassicSerialportClient = require('bluetooth-classic-serialport-client');
const serial_imu1 = new BluetoothClassicSerialportClient();
const serial_pressure = new BluetoothClassicSerialportClient();
const PLOTSAMPLINGTIME = 100; //ms
const pressureSensorName = "HC-06";

/////////////////////////////////
//** Webserver configuration **//
/////////////////////////////////
//
// Express initialization SWalker
const app = express();
app.set('port', process.env.PORT || 3000)
// Send static files
app.use(express.static(path.join(__dirname, 'public')));
// Configure PORT of the web
const server = app.listen(app.get('port'), () => {
    console.log('Server', app.get('port'));
})

/////////////////////////////////
//** Socket io configuration **//
/////////////////////////////////
// Socket io is the javascript library used for the
// realtime, bi-directional communication between web
// clients and servers.
//
// Give the server to socketio
const io = SocketIO(server);
var sockets = Object.create(null);

//////////////////////////////////////
//***** SENSORS DATA RECEPTION
//////////////////////////////
//

// vars of recorded therapy data
var record_therapy = false;
var is_first_data = [true, true, true, true];   //sw, imu1, pressure, imu3
var is_imu1_connected = false;
var is_pressure_connected = false;

// vars used for the imus data reception
var ascii_msg_imu1;
var alfa = 0; 
var beta = 0;
var gamma = 0;
var alfa_vector = []
var beta_vector =  []
var gamma_vector = []
var dcm_data_vector= []
var dcm_value1 = 0;
var dcm_value2 = 0;
var dcm_value3 = 0;
var dcm_value4 = 0;
var dcm_value5 = 0;
var dcm_value6 = 0;
var dcm_value7 = 0;
var dcm_value8 = 0;
var dcm_value9 = 0;
var dcm_value1_vector = [];
var dcm_value2_vector = [];
var dcm_value3_vector = [];
var dcm_value4_vector = [];
var dcm_value5_vector = [];
var dcm_value6_vector = [];
var dcm_value7_vector = [];
var dcm_value8_vector = [];
var dcm_value9_vector = [];
var RS = matrix([[0,0,0], [0,0,0], [0,0,0]])
var RT = matrix([[0,0,0], [0,0,0], [0,0,0]])
var R_cal = matrix([[0,0,0], [0,0,0], [0,0,0]])

var ascii_msg_pressure;
var row_values = [];
var pressure_value = 0;

var lasthex_imu1 = "";
var dcm_msgData = "";
var dcm_mode = false;

// IMU1 data reception (bt)
serial_imu1.on('data', function(data){ 
	// Check imu mode (DCM or ANGLES)
	if (data.toString().includes("#")){
		let key = data.toString().split('#')[1].substr(0,3)
		if (key == 'DCM'){
			dcm_mode = true;
		} else if (key == 'YPR'){
			dcm_mode = false;
		}  
	}

	// In Games mode the DCM matrix is needed. 
	if (!dcm_mode){
		// To change the imu streaming mode to DCM, the command "#om" must be sent
		var buf = Buffer.from('#om', 'utf8');
		serial_imu1.write(buf)
		.then(() => console.log('Command "#om" successfully written'))
		.catch((err) => console.log('Error en envío del cmando #om a imu', err))
		
		dcm_mode = true;
	
	// The imu streamming mode is already in DCM
	} else{
		try{
		// get the entire message from the received data ('#DCM= arg1, arg2...., arg10')
		 ascii_msg_imu1 = hex2a_general(data, lasthex_imu1, is_first_data[1]);
		 let msg_list = ascii_msg_imu1[0];
		 is_first_data[1] = ascii_msg_imu1[1];
		 
		 for(i=0; i<msg_list.length; i++){
			if(msg_list[i].includes("=") & msg_list[i].includes(',')){
				dcm_data_vector = msg_list[i].split('=')[1].split(',');				
				if(dcm_data_vector.length == 10){
					lasthex_imu1 = "";
					
					RS = matrix([[parseFloat(dcm_data_vector[0]), parseFloat(dcm_data_vector[1]), parseFloat(dcm_data_vector[2])],
					           [parseFloat(dcm_data_vector[3]), parseFloat(dcm_data_vector[4]), parseFloat(dcm_data_vector[5])],
					           [parseFloat(dcm_data_vector[6]), parseFloat(dcm_data_vector[7]), parseFloat(dcm_data_vector[8])]
					           ]);
					
					calculateEuler();
					//console.log(alfa, ',', beta)
					//console.log('#DCM=' + dcm_data_vector)

				} else {
					lasthex_imu1 = '#' + msg_list[i]
				}
			} else {
				lasthex_imu1 = '#' + msg_list[i]
			}
				
		}
		}catch(error){
			console.log(error);
		}
	}

}); 

serial_imu1.on('closed', function(){
	console.log("connection closed");
	
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu1",
		 status:3
	}) 
	
	disconnect_bt_device(sockets['websocket'], serial_imu1, is_imu1_connected, "imu1")

})

serial_imu1.on('failure', function(e){
	console.log(e);

})

serial_imu1.on('disconnected', function(e){
	console.log(e);

})


var data_pressure;
var lasthex_pressure = "";
serial_pressure.on('data', function(data){ 
	
	 ascii_msg_pressure = hex2a_general(data, lasthex_pressure, is_first_data[2]);
	 let msg_list_pressure = ascii_msg_pressure[0];
	 is_first_data[2] = ascii_msg_pressure[1];
	 
	 
	 for(i=0; i < msg_list_pressure.length; i++){
		if(msg_list_pressure[i].includes("=") & msg_list_pressure[i].includes(",")){
			let data_vector = msg_list_pressure[i].split('=')[1].split(',');
			if(data_vector.length == 2){
				lasthex_pressure = "";
				pressure_value = data_vector[0]
				if(record_therapy){
					if(is_imu1_connected){
						row_values.push([alfa, beta, gamma, pressure_value])			
					}
				}
			} else {
				lasthex_pressure = '#' + msg_list_pressure[i]
			}
		} else {
			lasthex_pressure = '#' + msg_list_pressure[i]
		}
	}
}); 
serial_pressure.on('closed', function(){
	
	console.log("connection with pressure closed");
	
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "pressure",
		 status:3
	})  //disconnected 
	
	disconnect_bt_device(sockets['websocket'], serial_pressure, is_pressure_connected, "pressure")
})


// Websockets
io.on('connection', (socket) => {
    console.log('new connection', socket.id);
    sockets['websocket'] = socket;
    
    var datitos=[];
    app.get('/downloadpressuresensor', (req, res) => setTimeout(function(){ res.download('./PressureSensor.xlsx'); }, 1000))

    // Send data to the charts in pressure_home
    
    setInterval(function () {
        socket.emit('pressure:data', {
		
            // IMU
            alfa: alfa ,
            beta: beta,
            gamma: gamma,
            // PRESSURE SENSOR
            pressure: pressure_value,
            
        })

    }, PLOTSAMPLINGTIME);

    
    // Connect IMU 
    socket.on('pressure:connect_imu1', function(callbackFn) {
	    
	console.log(is_imu1_connected);
        connect_bt_device(socket, serial_imu1, is_imu1_connected, "imu1");

    });
    // Disconnect IMU 1
    socket.on('pressure:disconnect_imu1', function(callbackFn) {
        // Reset all vectors
        imu1_yaw_vector = []
        imu1_pitch_vector = []
        imu1_roll_vector = []

       disconnect_bt_device(socket, serial_imu1, is_imu1_connected, "imu1");
       
    });
    // Connect Pressure Sensor
    socket.on('pressure:connect_pressure', function(callbackFn) {

    	console.log(is_pressure_connected);
        connect_bt_device(socket, serial_pressure, is_pressure_connected, "pressure");     

    });
    // Disconnect Pressure Sensor
    socket.on('pressure:disconnect_pressure', function(callbackFn) {

       disconnect_bt_device(socket, serial_pressure, is_pressure_connected, "pressure");

       
    });

    // Start therapy.
    socket.on('pressure:start', function(callbackFn) {
		
        // Start recording
        record_therapy = true;
       
        // IMU vars
        alfa = 0;
	beta = 0;
	gamma = 0;
	alfa_vector = [];
	beta_vector = [];
	gamma_vector = [];
	
	// Pressure vars
	pressure_value = 0;
	
	// To Excell
	row_values = [];
		
    });

    // Stop therapy.
    socket.on('pressure:stop', function(callbackFn) {

        record_therapy = false;

    });
    
    socket.on('pressure:download', function(callbackFn) {

    	const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('data');
        
        worksheet.addRow(["Milisegundos", "Alfa", "Beta", "Gamma", "Sensor Presión"]);
        for (var i = 0; i < row_values.length; i++) {
		let miliseconds = (i/50)*1000
		row_values[i].unshift(miliseconds)
		worksheet.addRow((row_values[i]));
	}
	workbook.xlsx.writeFile('PressureSensor.xlsx');
        

    });
    
    // calibrate Capture Motion sensor.
    socket.on('pressure:calibrate', function(callbackFn) {

		calibrateIMU();
		console.log("calibrando");
		
    });
});

function calculateEuler(){
	if(!dcm_mode){
		alfa = 0
		beta = 0
		gamma = 0;
	} 
	if(dcm_mode){
		RT = matrix.multiply(R_cal, RS)
		//console.log(alfa + "," + beta + "," + gamma)
		
		try{
			
			// CERVICAL Inclin + flexExt
			//alfa = Math.atan2(RT[0][2], RT[0][0]) * 180 / Math.PI;
			//beta = Math.asin(RT[0][1]) * 180 / Math.PI;
			//gamma = Math.atan2(-RT[2][1], RT[1][1]) * 180 / Math.PI;
			// CONVENIO pronosupinacion + FLEXOEXTENSION
			//alfa = Math.atan2(-RT[1][2], RT[1][1])*180 / Math.PI;
			//beta = Math.atan2(-RT[2][0], RT[0][0])*180 / Math.PI;
			//gamma = 0;
			
			// CONVENIO desviacion radial y cubital + FLEXOEXTENSION
			alfa = Math.asin(-RT[1][0])*180 / Math.PI;
			beta = Math.atan2(-RT[2][0], RT[0][0])*180 / Math.PI;
			gamma = 0;
			
					
		} catch (e){
			console.log("Alfa, beta, gamma calcs, error: " + e);
		}
	}

	
}
function calibrateIMU(){
	n = 1;
	R_cal = RS
	R_cal = R_cal.transpose()
}

function hex2a_general(hexx, lasthex, is_first_data) {
    var hex = hexx.toString();//force conversion
    var message = [];
    var newhex = "";
    
    if(is_first_data){
		is_first_data = false;
		lasthex = "";
		var splitted = [];
			
	} else {
		for (var i = 0; i < hex.length; i++){
			if (!(hex[i] == "\r" || hex[i] == "\n")){
				newhex += hex[i];
			}
		}
		
		newhex = lasthex + newhex;
		if (newhex.includes("#")){
			var splitted = newhex.split("#");
		} else {
			var splitted = []
		}
	
	}
	
    message.push(splitted)
    message.push(is_first_data)
    return message; 
}

var connected_PMSensors_addresses = [];
function connect_bt_device(socket, bt_object, status_boolean, str_device){
		
	if (!status_boolean){
		status_boolean = false;
		var deviceNotFound = true;
		var pairedDevices = bt_object.scan()
		.then(function(devices) {
			console.log("[Bt] Scanning devices ...");
			console.log(devices)
			
			// Check if the device is switch on and close to the raspberry
			for (let i = 0; i < devices.length; i++) {
				
				if(deviceNotFound){
					var device_name = devices[i].name;
					var device_address = devices[i].address;
							
					// case SWalker / pressure sensor
					if( str_device == 'pressure'){
						if(devices[i].name== pressureSensorName){
							console.log('[Bt] Pressure sensor found. Trying_connection...')
							deviceNotFound = false;
						}
					// case sensors ProMotion 
					}else {
						if (device_name.substr(device_name.length -3) == "-PM"){
							if(!connected_PMSensors_addresses.includes(device_address)){
								deviceNotFound = false;
								connected_PMSensors_addresses.push(str_device);
								connected_PMSensors_addresses.push(device_address);
							}
						}
					}
					
					// Device found
					if(!deviceNotFound){
						bt_object.connect(device_address)
						.then(function() {
							console.log('[Bt] Bluetooth connection established with device name: ' + device_name)
							socket.emit('pressure:connection_status', {
								device: str_device,
								// status--> 0: connect, 1: disconnect, 2: not paired
								status: 0
							})
							if (str_device == "imu1"){
								is_imu1_connected = true;
							
							}else if(str_device == "sw"){
								is_swalker_connected = true;
							} else if(str_device == "pressure"){
								is_pressure_connected = true;
							}
							
						})
						.catch(function(err) {
							// The device has not been found.
							var deviceNotFound = false;
							connected_PMSensors_addresses.pop(device_address);
							console.log('[Error] Device: ' + device_name , err);
							
							// message status in case GAMES interface
							socket.emit('pressure:connection_status', {
								device: str_device,
								// status--> 0: connect, 1: disconnect, 2: not paired
								status: 1
							})
						})
					}
				}
			}
			
			// Device not found
			if(deviceNotFound){
				console.log("device not found!");
				// message status in case GAMES interface
				socket.emit('pressure:connection_status', {   
					device: str_device,
					// status--> 0: connect, 1: disconnect, 2: not paired/not found
					status: 2
				})
			} 
		});
		
	
		
	}else{
		console.log('[Bt] The device is already connected!')
		socket.emit('pressure:connection_status', {
			device: str_device,
			// status--> 0: connect, 1: disconnect, 2: not paired
			status: 0
		}) 
    }
	
}

function disconnect_bt_device(socket, bt_object, status_boolean, str_device){
    if (status_boolean){
		if (connected_PMSensors_addresses.includes(str_device)){
			let index = connected_PMSensors_addresses.indexOf(str_device);
			connected_PMSensors_addresses.splice(index+1, 1);
			connected_PMSensors_addresses.pop(str_device);
		}
		bt_object.close()
		.then(function() {
			console.log('[Bt] Bluetooth connection successfully closed ');
			status_boolean = false;
			socket.emit('pressure:connection_status', {
					device: str_device,
					// status--> 0: connect, 1: error, 2: not paired, 3: disconnected
					status: 3
				})
		
		})
		.catch(function(err) {
			console.log('Connetion already close')
			
		})
	
		if (str_device == "imu1"){
			is_imu1_connected = false;
			dcm_mode = false;
		} else if(str_device == "pressure"){
			is_pressure_connected = false;
		}		
				
	}
	
}


