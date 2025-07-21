import React from 'react';
import Svg, { Circle } from 'react-native-svg';

const Cloud = ({ style }: any) => {
  return (
    <Svg height="80" width="140" viewBox="0 0 180 100" style={style}>
      <Circle cx="50" cy="50" r="30" fill="#ffffff" />
      <Circle cx="90" cy="40" r="40" fill="#ffffff" />
      <Circle cx="130" cy="50" r="30" fill="#ffffff" />
      <Circle cx="90" cy="60" r="35" fill="#dfe6e9" /> 
    </Svg>
  );
};

export default Cloud;
