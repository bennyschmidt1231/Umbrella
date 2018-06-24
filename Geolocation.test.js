import React from 'react';
import Geolocation from './Geolocation';

import renderer from 'react-test-renderer';

it('renders without crashing', () => {
    const rendered = renderer.create(<Geolocation />).toJSON();
    expect(rendered).toBeTruthy();
});
