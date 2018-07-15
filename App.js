import React, { Component } from 'react';
import { Text, View, StyleSheet, Linking, TouchableOpacity, Image, Alert, AsyncStorage, NetInfo, ActivityIndicator, TouchableHighlight, Button } from 'react-native';
import DateTimePicker from 'react-native-modal-datetime-picker';
import { MenuProvider } from 'react-native-popup-menu';
import NotificationsIOS, { NotificationAction, NotificationCategory } from 'react-native-notifications';


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
            precipPercentageDays: [],
            notifications: {},
            today: undefined,

        };
        NotificationsIOS.requestPermissions();
    }


    async getKey() {
        try {
            await AsyncStorage.removeItem('@Umbrella:currentNotificationTime');
            const value = await AsyncStorage.getItem('@Umbrella:currentNotificationTime');
            if (value !== null) {
                // We have data!!
                let date = new Date(value);
                this._handleDatePicked(value);
            }
        } catch (error) {
            console.log(error.message);
        }
    }

    async saveKey(value) {
        try {
            await AsyncStorage.setItem('@Umbrella:currentNotificationTime', value);
        } catch (error) {
            console.log("Error saving data" + error);
        }
    }


    _showDateTimePicker = () => this.setState({ isDateTimePickerVisible: true });

    _hideDateTimePicker = () => this.setState({ isDateTimePickerVisible: false });

    _handleDatePicked = (date) => {
        //Save current date
        this.saveKey(date.toString());
        //Stop Previous Notifications
        this.state.notifications = {};
        NotificationsIOS.cancelAllLocalNotifications();
        let day = 0;
        if (date < new Date()) day = 1;
        for (day; day < 8; day++) {
            let notificationMessage = this.notificationMessage(this.state.precipPercentageDays[day]);
            this.state.notifications[new Date(date.getTime() + (60 * 60 * 24 * 1000 * day))] = this.state.precipPercentageDays[day];
            let localNotification = NotificationsIOS.localNotification({
                alertTitle: "umbrella?",
                alertBody: notificationMessage,
                soundName: "ping.aiff",
                silent: false,
                fireDate: new Date(date.getTime() + (60 * 60 * 24 * 1000 * day)),
                userInfo: {}
            });
        }
        let comeBack = this.comeBackNotificaton();
        let localNotification = NotificationsIOS.localNotification({
            alertTitle: "umbrella?",
            alertBody: comeBack,
            soundName: "ping.aiff",
            silent: false,
            fireDate: new Date(date.getTime() + (60 * 60 * 24 * 1000 * 8)),
            userInfo: {}
        });
        this._hideDateTimePicker();
    };

    componentDidMount() {
        this.initialise();
    }

    async initialise() {
        this.getKey();
        let isLocationAlert = false;
        let isInternetAlert = false;
        let ready = false;
        this.setState({
            latitude: null,
            longitude: null,
            error: null,
            weatherData: null,
            needUmbrella: null,
            isLoading: true,
            isDateTimePickerVisible: false,
            mode: 'time',
            precipPercentageDays: [],
            notifications: {},
            today: undefined,
        });
        while (ready === false) {
            let locationPromise = new Promise(function(resolve, reject) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve(position);
                    },
                    (error) => {
                        reject(error);
                    }, { enableHighAccuracy: true, timeout: 20000, todayAge: 1000 },
                );
            });
            await this.sleep(1000);
            locationPromise.then((position) => {
                this.setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    other: null
                });
                return fetch(`https://api.darksky.net/forecast/24b512e535b9e0cf1c0306eec7b07e1e/${this.state.latitude},${this.state.longitude}`)
                    .then((response) => response.json())
                    .then((responseJson) => {
                        ready = true;
                        this.setState({
                            isLoading: false,
                            weatherData: responseJson
                        }, function() {

                        });
                        this.checkForRain(responseJson);
                        this.setState({ error: null });
                    })
                    .catch((error) => {
                        this.setState({ error: true });
                        if (isInternetAlert === false) {
                            isInternetAlert = true;
                            // Works on both iOS and Android
                            Alert.alert(
                                'No Internet Connection',
                                'Turn on WiFi or Mobile Data in Settings to allow umbrella to work its magic', [
                                    { text: 'Settings', onPress: () => Linking.openURL('app-settings:') },
                                    { text: 'OK', onPress: () => console.log('OK Pressed') },
                                ], { cancelable: false }
                            )
                        }
                    });

            }, (error) => {
                this.setState({ error: true });
                if (isLocationAlert === false) {
                    isLocationAlert = true;
                    // Works on both iOS and Android
                    Alert.alert(
                        'Location Services Off',
                        'Turn on Location Services in Settings to allow umbrella to determine your current location', [
                            { text: 'Settings', onPress: () => Linking.openURL('app-settings:') },
                            { text: 'OK', onPress: () => console.log('OK Pressed') },
                        ], { cancelable: false }
                    )
                }
            });
        }
    }


    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    checkForRain(daily) {
        let weatherData = daily.daily.data;
        let today = weatherData[0].precipProbability;
        for (let index in weatherData) {
            this.state.precipPercentageDays.push(this.getMessage(weatherData[index].precipProbability));
        }
        this.setState({ today: today });
        if (today < 0.10) {
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
                needUmbrella: 'yeah mate.'
            });
        }
    }

    notificationMessage(message) {
        let messages = [`Survey says ~ ${message}`, `We just shook our magic 8-ball 🎱 and it said '${message}'`, `${message}`, `Hotel? Trivago. Umbrella? ${message}`, `( ͡° ͜ʖ ͡°) Lenny face says ${message} ☂️`, `☂️? ${message}`, `BREAKING NEWS: Umbrella just said ${message}`, `☂️? ${message} Have a great day!`, `According to multiple sources, umbrella is going to predict today as a '${message}'`];
        let index = Math.floor(Math.random() * (9));
        return messages[index];
    }

    comeBackNotificaton() {
        let comeBackMessages = ["Come back ~ we miss you 😭😭. We can change. ☂️☂️", "It's been so long since you opened us that we are now a coffee shop. Open us for a free cup of coffee ☕"];
        let index = Math.floor(Math.random() * (3));
        return comeBackMessages[index];
    }

    getMessage(percentage) {
        if (percentage < 0.10) {
            return 'nope.';
        } else if (percentage < 0.35) {
            return 'probably not.';
        } else if (percentage < 0.55) {
            return 'maybe.';
        } else if (percentage < 0.8) {
            return 'probably.';
        } else {
            return 'yeah mate.';
        }
    }

    render() {
        if (this.state.error) {
            return ( <
                View style = { { flex: 1 } } >
                <
                View style = { { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' } } >
                <
                Image style = {
                    {
                        width: 100,
                        height: 100,
                        resizeMode: Image.resizeMode.contain,
                    }
                }
                source = { require("./assets/umbrella_icon.png") }
                /><ActivityIndicator/ > <
                Text style = { styles.percentage } allowFontScaling = { false } > { "Please make sure internet and location is enabled" } < /Text>< /
                View > <
                /View>

            );
        } else if (this.state.isLoading) {
            return ( <
                View style = { { flex: 1 } } >
                <
                View style = { { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' } } >
                <
                Image style = {
                    {
                        width: 100,
                        height: 100,
                        resizeMode: Image.resizeMode.contain,
                    }
                }
                source = { require("./assets/umbrella_icon.png") }
                /><ActivityIndicator/ > < /
                View > <
                /View>

            );
        } else {
            return ( <
                MenuProvider >
                <
                View style = { { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' } } >
                <
                Image style = {
                    {
                        width: 100,
                        height: 100,
                        resizeMode: Image.resizeMode.contain,
                    }
                }
                source = { require("./assets/umbrella_icon.png") }
                /> <
                Text style = { styles.result } allowFontScaling = { false } > { this.state.needUmbrella } < /Text> <
                Text style = { styles.percentage } allowFontScaling = { false } > Percentage of rain: { Math.round(this.state.today * 100) } % < /Text> <
                TouchableOpacity onPress = { this._showDateTimePicker } >
                <
                Text allowFontScaling = { false } style = { styles.notificationTime } > Set Notification Time < /Text> < /
                TouchableOpacity > <
                DateTimePicker isVisible = { this.state.isDateTimePickerVisible } mode = { this.state.mode } onConfirm = { this._handleDatePicked } onCancel = { this._hideDateTimePicker } titleIOS = { "Pick a Time" }
                />  <
                TouchableOpacity onPress = {
                    () => this.initialise()
                }
                style = { { paddingTop: 20 } } >
                <
                Image style = {
                    {
                        width: 20,
                        height: 20,
                        resizeMode: Image.resizeMode.contain,
                    }
                }
                source = { require('./assets/reload.png') }
                /> < /
                TouchableOpacity >

                <
                Text style = { styles.title } onPress = {
                    () => Linking.openURL('https://darksky.net/poweredby/')
                }
                allowFontScaling = { false } >
                Powered by Dark Sky < /Text> < /
                View > <
                /MenuProvider>
            );
        }
    }
}

const styles = StyleSheet.create({
    title: {
        color: 'black',
        fontWeight: 'bold',
        top: 80,
        left: 0
    },
    reloadStyle: {
        fontSize: 10,
        left: 0,
        color: 'black',
        fontWeight: 'bold',
        paddingTop: 25
    },
    notificationTime: {
        fontSize: 15,
        left: 0,
        color: 'blue',
        paddingTop: 20
    },
    result: {
        fontWeight: 'bold',
        fontSize: 40,
        padding: 15,
    },
    percentage: {
        fontWeight: 'bold',
        fontSize: 10,
        padding: 10
    }
});