         function(properties, context) {



         var uidInput;
         var outputJSONString = "";
         var outputLogString = "";
         var depthMax = 0;
         var logText = "";
         var hrStart = process.hrtime();
         var hrEnd = 0 ;
            
         // INITIALIZE INPUTS

         // take JSON configuration and parse it into a local object
         try{
            var fieldMap = JSON.parse( properties.configuration );
         }

         // if there was trouble parsing 
         catch(err){
            return { json : "{ \"error\" : \"configuration JSON is not valid" + " | " + err.message + "\"}"};
         }

         // enforce recursion limit
         if ( properties.depth < 7  && properties.depth > 0 ) { 
            depthMax = properties.depth;
         }

         else {
            depthMax = 0;
         }


         var monthNames = [
             "Jan", "Feb", "Mar",
             "Apr", "May", "Jun", "Jul",
             "Aug", "Sep", "Oct",
             "Nov", "Dec"
         ];

         var weekdays = [
             "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"
         ];            
            
            
            
            

         // FIND UID STRINGS FROM THINGS

         try{

            // get LIST of UIDs from things
            if ( properties.list_of_things != undefined ){
                var thingList = properties.list_of_things;
                uidInput = thingList.get( 0, thingList.length( ) ).map( ( x ) => { return x.get( "_id" ); } ) ;
                log( 'found a list of things ' + uidInput );


            }

            // get SINGLE UID from thing
            else if ( properties.thing != undefined ){
                uidInput = "";
                uidInput = properties.thing.get( "_id" );
                log( 'found a thing' + uidInput );
            }

            else {
                return { json : "{ \"error\" : \"no input thing\(s\) detected\" }"};
            }
         } 

         // If missing thing(s) or db lookup failed.   
         catch(err){
            log( "input uid error | " + err.message ) ;
            return { json : "{ \"error\" : \"problem loading UIDs of the thing\(s\) | output log: " + logText + " \" }" };

         }

         function formatPhoneNumber(phoneNumberString) {
           var cleaned = ('' + phoneNumberString).replace(/\D/g, '')
           var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
           if (match) {
              log("formatPhoneNumber() returning this: " + '(' + match[1] + ') ' + match[2] + '-' + match[3]);
              return '(' + match[1] + ') ' + match[2] + '-' + match[3]
              
           }
           return null
         }



         // FORMATTING FUNCTION
         // used to copy/delete/format the keys & values.  

         function format( dataObject, dataKey, depth ) {


            
            // if the input object or configuration are empty, exit the function.
            if ( dataObject == undefined  || fieldMap == undefined ){

               return dataObject;
            }



            // find an object matching the key & _type ID
            var obj = fieldMap.find( o => ( o.field_id === dataKey  &&  o.type === dataObject._type )  ||  ( o.field_id === dataKey  &&  o.type === '_all' ) );

            //  if 'field_id' was not found
            if ( obj === undefined ){
               
               // delete object by default   ( when 'white list' mode enabled) 
               if (properties.white_list === true){
                  log ('deleting because not in white list ' + properties.white_list, depth);
                  delete dataObject[dataKey];
               
               }
               return 0;
               
            }

            // delete - if 'new_id' is null 
            if ( obj.new_id === null ){
               log ('deleting ' + dataKey + ' because null value in new_id ', depth);
               delete dataObject[dataKey];
               return 0;
            }
            
            var newKey = obj.field_id;
            var newValue = dataObject[dataKey];
            
            
            
            // Value formatting - boolean/time/date/currency

            if ( obj.format != undefined ){   
                  
                  var date = new Date( dataObject[dataKey] );        

                    // format the ISO date

                    // 01/01/2012
                    if ( obj.format === "mmddyyyy" ){
                        newValue = ( date.getMonth(  )+1 ) + '/' + date.getDate(  ) + '/' + date.getFullYear(  );
                    }
                    // Jan 1 2012
                    if ( obj.format === "mmmddyyyy" ){
                       newValue = monthNames[date.getMonth(  )] + ' ' + date.getDate(  ) + ', ' + date.getFullYear(  );
                    }
                    // Tue Jan 1 2012
                    if ( obj.format === "DDmmmddyyyy" ){
                       newValue = weekdays[date.getDay(  )] + " " + monthNames[date.getMonth(  )] + ' ' + date.getDate(  ) + ', ' + date.getFullYear(  );
                    }

                    // format USD currency format      
                    if ( obj.format === "USD" ){

                       var symbol = "$";
                       var currencyAmount = Number( dataObject[dataKey] ).toFixed( 2 );
                          if ( currencyAmount < 0 ){
                              symbol = "-$";
                              currencyAmount = currencyAmount * -1;

                          }
                    newValue = symbol + currencyAmount;
                    }


                    // format phone number  
               
                    if ( obj.format === "phone" ){
                       newValue = formatPhoneNumber(dataObject[dataKey]);
                    }

                    // format as a boolean

                    if ( obj.format === "boolean" ){
                          //if value is boolean we are converting to a string
                          if ( dataObject[dataKey] === true ){
                             newValue = "true";
                          }     
                          if ( dataObject[dataKey] === false ){
                             newValue = "false";
                          }
                          // if value is string or number, make it the key and set to true.
                          else {
                             newValue = {};
                             newValue[dataObject[dataKey]] = true ;
                          }
                    }
                    
   

               }

            
            // rename the 'field_id' if specified.
            if ( obj.new_id !== undefined ){
                newKey = obj.new_id;
            }

            dataObject[newKey] = newValue;
               
               
            if ( obj.copy !== true  &&  obj.field_id !== obj.new_id  &&  obj.new_id !== undefined  ){
               log(JSON.stringify(obj));
               
               log( obj.copy !== true + " && " + obj.field_id !== obj.new_id  + " && " + obj.new_id !== undefined );
               
               log ("deleting " + dataObject._type + "->" + dataKey, depth);
               delete dataObject[dataKey];
               return 0;
            }
         }


            
            
            
            
         // UID EXPANSION FUNCTION
         // Takes a UID or UIDs and recursively expands upon them 
            
         function expand( id, depth ){

               var object;
               depth++;
               log ('starting expand ()', depth);
               if ( id == undefined ) {
                  depth--;
                  log ('id is undefined, exiting', depth);
                  return id;
               }

               // max depth of recursion
               if ( depth > depthMax ) {
                  log ("max depth reached: exiting" + depthMax, depth);
                  depth--;
                  return id ;


               }
                  // if the function input is an array of UIDs
                  if ( Array.isArray( id ) === true ) {
                  
                  object = [];
                     try{
                        // loop the array and query the db for the UIDs
                        for ( var i = 0 ; i < id.length ; i++ ) {
                           log ( 'List of UIDs ' + (i + 1) + "/" + id.length, depth);
                           var objectElement = 0;

                           //query the current UID (return an on object)
                           objectElement = get_object_from_id( id[i] ) ; 
                           log ("object element queried");
                           // map through the IDs key/value pairs
                           // mapKeys() calls this outer function again if  more UIDs are found
                           mapKeys ( objectElement , depth );
                           object.push( objectElement );
                           
                        }
                     }
                        catch(err){ 
                           log ("error getting the IDs: " + id + " | " + err.message , depth );
                           depth--;
                           return id;
                     }



                  }

                  else {
                     object = 0;

                     // try this single UID     
                     try{
                        object = get_object_from_id( id );
                     }

                     // return the ID string if there was an error
                     catch(err){
                        log ("error getting the ID: " + id + " | " + err.message, depth );
                        depth--;
                        return id;
                     }

                     //check that the object is defined, then call mapKeys()
                     if (object != undefined){
                          mapKeys ( object, depth );
                     }

                  }

               //de escalate the depth tracker and exit the function
               depth--;
               log('exiting function' , depth);
               return object;
         }

            
         
         // MAPPING FUNCTION
         // Loop through each field in the record - check values for UIDs to further expand, trigger key/value formatting
         function mapKeys ( mapObject, depth ){


            if (mapObject != undefined) {

               log( 'mapping through ' + mapObject._type  + "'s keys", depth);
               Object.keys( mapObject ).map( function( key, index ){
                  if (mapObject[key] != undefined) {
                     //set the value to be tested
                      
                     var testValue;
                     // set first value of any arrays to be tested 
                     if ( Array.isArray( mapObject[key] ) === true )  {
                        testValue = mapObject[key][0];
                     }
                     else {
                        testValue = mapObject[key];
                     }
                     // test KEY includes '_custom_' and the VALUE matches 32-digit bubble ID format
                     if ( ( /[0-9]{13}x[0-9]{18}/.test( testValue ) === true ) &&  (( /.*_custom_.*/.test( key ) === true )  || ( /.*_user/.test( key ) === true ) ) ){
               //      if ( ( /.*_custom_.*/.test( key ) === true )  &&  ( /[0-9]{13}x[0-9]{18}/.test( testValue ) === true ) ){
                        // run the parent function if it does, pass in the depth
                        log("expand (" + key + ")\n", depth );
                        mapObject[key] = expand( mapObject[key] , depth );

                     }

                     // format this key/value pair 
                    format( mapObject, key, depth);
                  }
               });

            }
         return mapObject;
         }


         // logging 
         function log( a, depth = 0 ){
            if ( properties.console_logging === true ) {
               console.log ( process.hrtime(hrStart)[0] + " " + process.hrtime(hrStart)[1] / 1000000 + " | " +  a );
            }
            if ( properties.output_logging === true ) {
               logText = logText + " | " + process.hrtime(hrStart)[0] + " " + process.hrtime(hrStart)[1] / 1000000 + "\n" + spaces(depth, "--->") + a;
            }

         }
         
         //pretty print for logging

         function spaces(num, char){
            var blankSpace = "";
            for ( var i = 0; i < num ; i++ ){
                 blankSpace = blankSpace + " " + num + " |";
            }
            return blankSpace;
         }

            
            
         
            
            
         // ** INITIALIZE MAIN FUNCTION
         log( '** begin main function ** ' + uidInput );   
         var outputObject = expand( uidInput, 0 ) ;



         // enable output logging?
         if (properties.output_logging === true) { 
              log ('-----------'); 
              outputLogString = logText;
         }


         //create JSON string from JS object                      ** indent property**
         outputJSONString = JSON.stringify( outputObject, null, properties.indent ); 

         // wrap in array?
         if (properties.wrap_in_array === true) {
            outputJSONString = "[" + outputJSONString + "]";   
         }


         return { json : outputLogString + outputJSONString };


         }