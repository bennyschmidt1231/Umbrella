import React, {Component} from 'react';
import {Text, View, StyleSheet, Linking, TouchableOpacity, Image, Alert} from 'react-native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import {MenuProvider} from 'react-native-popup-menu';


export default class Umbrella extends Component {
    constructor(props) {
        super(props);

        this.state = {
            latitude: null,
            longitude: null,
            error: null,
            weatherData: null,
            needUmbrella: null,
            isLoading: true,
            isDateTimePickerVisible: false,
            mode: 'time',
            currentTime: null,
            precipPercentageDays: [],
            notifications: {},
            today: undefined,

        };
    }

    _showDateTimePicker = () => this.setState({isDateTimePickerVisible: true});

    _hideDateTimePicker = () => this.setState({isDateTimePickerVisible: false});

    _handleDatePicked = (date) => {
        this.state.notifications = {};
        let day = 0;
        if(date < new Date()) day = 1;
        for(day; day < 8; day++) {
            this.state.notifications[new Date(date.getTime() + (60 * 60 * 24 * 1000 * day))] = this.state.precipPercentageDays[day];
        }
        this._hideDateTimePicker();
    };


    componentDidMount() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null,
                    other: null
                });
                return fetch(`https://api.darksky.net/forecast/24b512e535b9e0cf1c0306eec7b07e1e/${this.state.latitude},${this.state.longitude}`)
                    .then((response) => response.json())
                    .then((responseJson) => {
                        this.setState({
                            isLoading: false,
                            weatherData: responseJson
                        }, function () {

                        });
                        this.checkForRain(responseJson);
                    })
                    .catch((error) => {
                        this.setState({error: error.message});
                        // Works on both iOS and Android
                        Alert.alert(
                            'No Internet Connection',
                            'Turn on WiFi or Mobile Data in Settings to allow umbrella to work its magic',
                            [
                                {text: 'Settings', onPress: () => Linking.openURL('app-settings:')},
                                {text: 'OK', onPress: () => console.log('OK Pressed')},
                            ],
                            { cancelable: false }
                        )
                    });
            },
            (error) => {
                this.setState({error: error.message});
                // Works on both iOS and Android
                Alert.alert(
                    'Location Services Off',
                    'Turn on Location Services in Settings to allow umbrella to determine your current location',
                    [
                        {text: 'Settings', onPress: () => Linking.openURL('app-settings:')},
                        {text: 'OK', onPress: () => console.log('OK Pressed')},
                    ],
                    { cancelable: false }
                )
            },
            {enableHighAccuracy: true, timeout: 20000, todayAge: 1000},
        );
    }

    checkForRain(daily) {
        let weatherData = daily.daily.data;
        let today = weatherData[0].precipProbability;
        for(let index in weatherData) {
            this.state.precipPercentageDays.push(this.getMessage(weatherData[index].precipProbability));
        }
        this.setState({today: today});
        if (today < 0.05) {
            this.setState({
                needUmbrella: 'nope.'
            });
        } else if (today < 0.35) {
            this.setState({
                needUmbrella: 'probably not.'
            });
        } else if (today < 0.55) {
            this.setState({
                needUmbrella: 'maybe.'
            });
        } else if (today < 0.8) {
            this.setState({
                needUmbrella: 'probably.'
            });
        } else {
            this.setState({
                needUmbrella: 'most definitely.'
            });
        }
    }

    getMessage(percentage) {
        if (percentage < 0.05) {
            return 'nope.';
        } else if (percentage < 0.25) {
            return 'probably not.';
        } else if (percentage < 0.55) {
            return 'maybe.';
        } else if (percentage < 0.8) {
            return 'probably.';
        } else {
            return 'most definitely.';
        }
    }

    render() {
        if (this.state.isLoading) {
            return (
                <View style={{flex: 1}}>
                    <View style={{flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center'}}>
                        <Image style={{
                            width: 100,
                            height: 100,
                            resizeMode: Image.resizeMode.contain,
                        }} source={require("./assets/umbrella_icon.png")}/>
                    </View>
                </View>

            );
        }
        return (
            <MenuProvider>
                <View style={{flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center'}}>
                    <Image style={{
                        width: 100,
                        height: 100,
                        resizeMode: Image.resizeMode.contain,
                    }} source={require("./assets/umbrella_icon.png")}/>
                    <Text style={styles.result}>{this.state.needUmbrella}</Text>
                    <TouchableOpacity onPress={this._showDateTimePicker}>
                        <Text>Set Notification Time</Text>
                    </TouchableOpacity>
                    <DateTimePicker
                        isVisible={this.state.isDateTimePickerVisible}
                        mode={this.state.mode}
                        onConfirm={this._handleDatePicked}
                        onCancel={this._hideDateTimePicker}
                        titleIOS={"Pick a Time"}
                    />
                    <Text style={styles.title} onPress={() => Linking.openURL('https://darksky.net/poweredby/')}>
                        Powered by Dark Sky</Text>
                </View>
            </MenuProvider>
        );

    }
}

const styles = StyleSheet.create({
    title: {
        color: 'blue',
        fontWeight: 'bold',
        top: 100,
        left: 0
    },
    result: {
        fontWeight: 'bold',
        fontSize: 50,
        padding: 20,
    }
});
