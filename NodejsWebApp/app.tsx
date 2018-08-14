declare var require: any

var React = require('react');
// import {
//    Platform,
//    View,
//    StyleSheet,
//    TouchableOpacity,
//    ScrollView,
//    Text,
//    Switch,
// } from 'react-native';
var ReactDOM = require('react-dom');
var MapView = require('react-native-maps');

class Hello extends React.Component {
    render() {
        return (
            <h1>Welcome to React!!</h1>
            // <MapView
            //    initialRegion={{
            //        latitude: 37.78825,
            //        longitude: -122.4324,
            //        latitudeDelta: 0.0922,
            //        longitudeDelta: 0.0421,
            //    }}
            // />
        );
    }
}

ReactDOM.render(<Hello />, document.getElementById('root'));