

const path = require('path'); // Modulo de nodejs para trabajar con rutas
const express = require('express'); // Configurar express
const fs = require('fs'); //  File System module
const net = require('net');
const SocketIO = require('socket.io');
const ExcelJS = require('exceljs');
const matrix = require('node-matrix');

const BluetoothClassicSerialportClient = require('bluetooth-classic-serialport-client');
const serial_imu1 = new BluetoothClassicSerialportClient();
const serial_imu2 = new BluetoothClassicSerialportClient();
const PLOTSAMPLINGTIME = 100; //ms
const IMUSensorName1 = "20220015-PM";
const IMUSensorName2 = "20220014-PM";

var msecondsFromLastMessage_imu1 = 0;
var msecondsFromLastMessage_imu2= 0;

/////////////////////////////////
//** Webserver configuration **//
/////////////////////////////////
//
// Express initialization SWalker
const app = express();
app.set('port', process.env.PORT || 4000)
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
var is_imu2_connected = false;

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

// vars used for the imu2 data reception
var ascii_msg_imu2;
var alfa2 = 0; 
var beta2 = 0;
var gamma2 = 0;
var alfa2_vector = []
var beta2_vector =  []
var gamma2_vector = []
var dcm2_data_vector= []
var dcm2_value1 = 0;
var dcm2_value2 = 0;
var dcm2_value3 = 0;
var dcm2_value4 = 0;
var dcm2_value5 = 0;
var dcm2_value6 = 0;
var dcm2_value7 = 0;
var dcm2_value8 = 0;
var dcm2_value9 = 0;
var dcm2_value1_vector = [];
var dcm2_value2_vector = [];
var dcm2_value3_vector = [];
var dcm2_value4_vector = [];
var dcm2_value5_vector = [];
var dcm2_value6_vector = [];
var dcm2_value7_vector = [];
var dcm2_value8_vector = [];
var dcm2_value9_vector = [];
var RS2 = matrix([[0,0,0], [0,0,0], [0,0,0]])
var RT2 = matrix([[0,0,0], [0,0,0], [0,0,0]])
var R_cal2 = matrix([[0,0,0], [0,0,0], [0,0,0]])


// IMU1 data reception (bt)
var lasthex_imu1 = "";
var dcm_msgData = "";
var dcm_mode = false;

serial_imu1.on('data', function(data){ 
	msecondsFromLastMessage_imu1 = 0;
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

						if(record_therapy){
							if(is_imu2_connected){
								row_values.push([alfa, beta, gamma, alfa2, beta2, gamma2])			
							}
						}

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

serial_imu1.on('closed', function(e){
	console.log("imu sensor error closed")
	
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu1",
		 status:3
	}) 
	
})

serial_imu1.on('failure', function(e){
	console.log(e);
	console.log("imu sensor error failrure")
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu1",
		 status:3
	}) 
})

serial_imu1.on('disconnected', function(){
	console.log("imu sensor was disconnected")
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu1",
		 status:3
	}) 
})


// IMU1 data reception (bt)
var lasthex_imu2 = "";
var dcm2_msgData = "";
var dcm2_mode = false;

serial_imu2.on('data', function(data){ 
	msecondsFromLastMessage_imu2 = 0;
	// Check imu mode (DCM or ANGLES)
	if (data.toString().includes("#")){
		let key = data.toString().split('#')[1].substr(0,3)
		if (key == 'DCM'){
			dcm2_mode = true;
		} else if (key == 'YPR'){
			dcm2_mode = false;
		}  
	}

	// In Games mode the DCM matrix is needed. 
	if (!dcm2_mode){
		// To change the imu streaming mode to DCM, the command "#om" must be sent
		var buf = Buffer.from('#om', 'utf8');
		serial_imu2.write(buf)
		.then(() => console.log('Command "#om" successfully written'))
		.catch((err) => console.log('Error en envío del cmando #om a imu', err))
		
		dcm2_mode = true;
	
	// The imu streamming mode is already in DCM
	} else{
		try{
			// get the entire message from the received data ('#DCM= arg1, arg2...., arg10')
			 ascii_msg_imu2 = hex2a_general(data, lasthex_imu2, is_first_data[2]);
			 let msg_list = ascii_msg_imu2[0];
			 is_first_data[2] = ascii_msg_imu2[1];
			 
			 for(i=0; i<msg_list.length; i++){
				if(msg_list[i].includes("=") & msg_list[i].includes(',')){
					dcm2_data_vector = msg_list[i].split('=')[1].split(',');				
					if(dcm2_data_vector.length == 10){
						lasthex_imu2 = "";
						
						RS2 = matrix([[parseFloat(dcm2_data_vector[0]), parseFloat(dcm2_data_vector[1]), parseFloat(dcm2_data_vector[2])],
						           [parseFloat(dcm2_data_vector[3]), parseFloat(dcm2_data_vector[4]), parseFloat(dcm2_data_vector[5])],
						           [parseFloat(dcm2_data_vector[6]), parseFloat(dcm2_data_vector[7]), parseFloat(dcm2_data_vector[8])]
						           ]);
						
						calculateEuler2();
						//console.log(alfa, ',', beta)
						//console.log('#DCM=' + dcm_data_vector

					} else {
						lasthex_imu2 = '#' + msg_list[i]
					}
				} else {
					lasthex_imu2 = '#' + msg_list[i]
				}
					
			}
		}catch(error){
			console.log(error);
		}
	}

}); 

serial_imu2.on('closed', function(e){
	console.log("imu sensor error closed")
	
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu2",
		 status:3
	}) 
	
})

serial_imu1.on('failure', function(e){
	console.log(e);
	console.log("imu sensor error failrure")
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu2",
		 status:3
	}) 
})

serial_imu1.on('disconnected', function(){
	console.log("imu sensor was disconnected")
	sockets['websocket'].emit('pressure:connection_status',{
		 device: "imu2",
		 status:3
	}) 
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
            // IMU 2
            alfa2: alfa2 ,
            beta2: beta2,
            gamma2: gamma2,
            
        })
        // check if imu sensor is still connected
        if(is_imu1_connected){
	        msecondsFromLastMessage_imu1 += 100
	        if(msecondsFromLastMessage_imu1 >= 3000){
	        	disconnect_bt_device(socket, serial_imu1, is_imu1_connected, "imu1");
	        	msecondsFromLastMessage_imu1 = 0
	        }
	    }
	    // check if pressure sensor is still connected
	    if(is_imu2_connected){
	        msecondsFromLastMessage_imu2 += 100
	        if(msecondsFromLastMessage_imu2 >= 3000){
			disconnect_bt_device(socket, serial_imu2, is_imu2_connected, "imu2");
	        	msecondsFromLastMessage_imu2 = 0
	        }
	    }

    }, PLOTSAMPLINGTIME);

    
    // Connect IMU 
    socket.on('pressure:connect_imu1', function(callbackFn) {
	    
		console.log(is_imu1_connected);
        connect_bt_device(socket, serial_imu1, is_imu1_connected, IMUSensorName1, "imu1");

    });
    // Disconnect IMU 1
    socket.on('pressure:disconnect_imu1', function(callbackFn) {
        // Reset all vectors
        imu1_yaw_vector = []
        imu1_pitch_vector = []
        imu1_roll_vector = []

        try {
			disconnect_bt_device(socket, serial_imu1, is_imu1_connected,  "imu1");
		} catch(e){
			console.log("the imu connection is already disconnected")
			is_imu1_connected = false;
		}
       
       
    });
      // Connect IMU 
    socket.on('pressure:connect_imu2', function(callbackFn) {
	    
		console.log(is_imu2_connected);
        connect_bt_device(socket, serial_imu2, is_imu2_connected, IMUSensorName2, "imu2");

    });
    // Disconnect IMU 1
    socket.on('pressure:disconnect_imu2', function(callbackFn) {
        // Reset all vectors
        imu2_yaw_vector = []
        imu2_pitch_vector = []
        imu2_roll_vector = []

        try {
			disconnect_bt_device(socket, serial_imu2, is_imu2_connected, "imu2");
		} catch(e){
			console.log("the imu connection is already disconnected")
			is_imu2_connected = false;
		}
       
       
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
		
		// IMU 2 vars
		alfa2 = 0;
		beta2 = 0;
		gamma2 = 0;
		alfa2_vector = [];
		beta2_vector = [];
		gamma2_vector = [];
		
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
        
        worksheet.addRow(["timestamp", "Alfa", "Beta", "Gamma", "Alfa 2", "Beta 2", "Gamma 2"]);
        for (var i = 0; i < row_values.length; i++) {
        	let miliseconds = (i/35)*1000     // Asumo 35 Hz
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
			
			// CONVENIO desviacion radial y cubital + FLEXOEXTENSION
			alfa = Math.atan2(-RT[2][0], RT[2][2]) * 180 / Math.PI;
			beta = Math.atan2(-RT[0][1], RT[1][1]) * 180 / Math.PI;;
			gamma = Math.atan2(-RT[1][2], RT[1][1]) * 180 / Math.PI;
						
		} catch (e){
			console.log("Alfa, beta, gamma calcs, error: " + e);
		}
	}
}
function calculateEuler2(){
	if(!dcm2_mode){
		alfa2 = 0
		beta2 = 0
		gamma2 = 0;
	} 
	if(dcm2_mode){
		RT2 = matrix.multiply(R_cal2, RS2)
		//console.log(alfa + "," + beta + "," + gamma)
		
		try{
			
			// CONVENIO desviacion radial y cubital + FLEXOEXTENSION
			alfa2 = Math.atan2(-RT2[2][0], RT2[2][2]) * 180 / Math.PI;
			beta2 = Math.atan2(-RT[0][1], RT[1][1]) * 180 / Math.PI;;
			gamma2 = Math.atan2(-RT[1][2], RT[1][1]) * 180 / Math.PI;
						
		} catch (e){
			console.log("Alfa, beta, gamma calcs, error: " + e);
		}
	}
}
function calibrateIMU(){
	R_cal = RS
	R_cal = R_cal.transpose()

	R_cal2 = RS2
	R_cal2 = R_cal2.transpose()

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
function connect_bt_device(socket, bt_object, status_boolean, sensor_name, str_device){
		
	if (!status_boolean){
		status_boolean = false;
		var deviceNotFound = true;
		var pairedDevices = bt_object.listPairedDevices()
		.then(function(devices) {
			console.log("[Bt] Scanning devices ...");
			console.log(devices)
			
			// Check if the device is switch on and close to the raspberry
			for (let i = 0; i < devices.length; i++) {
				
				if(deviceNotFound){
					var device_name = devices[i].name;
					var device_address = devices[i].address;

					if (device_name.substr(device_name.length -3) == "-PM"){
						if(device_name == sensor_name){
							console.log(device_name)
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
							
							}else if(str_device == "imu2"){
								is_imu2_connected = true;
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
		})
		.catch((err) => console.log('Error',err))
		
	
		
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
		} else if(str_device == "imu2"){
			is_imu2_connected = false;
			dcm2_mode = false;
		}		
				
	}
	
}


