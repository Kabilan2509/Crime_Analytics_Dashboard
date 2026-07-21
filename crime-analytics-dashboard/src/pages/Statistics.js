import React from 'react';
import StatisticsPage from '../features/statistics/StatisticsPage/StatisticsPage';

/**
 * Statistics Page Wrapper
 * Integrates KSP Crime Statistics Console with route navigation.
 */
function Statistics({ selectedDistrict = 'all', selectedCrimeType = 'all', dateRange = 'all' }) {
  return (
    <StatisticsPage
      defaultDistrict={selectedDistrict}
      defaultCrimeType={selectedCrimeType}
      defaultDateRange={dateRange === 'all' ? 'last_year' : dateRange}
    />
  );
}

export default Statistics;
