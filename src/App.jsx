import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Info, AlertCircle, RefreshCcw } from 'lucide-react';

// Main App component
const App = () => {
    // State variables for inputs and outputs
    const [currentPrice, setCurrentPrice] = useState('');
    const [fearGreedIndex, setFearGreedIndex] = useState('');
    const [fundamentalOutlook, setFundamentalOutlook] = useState('Neutral'); // User can select: Bullish, Neutral, Bearish

    // New Fundamental Inputs
    const [interestRateOutlook, setInterestRateOutlook] = useState('Neutral'); // Hawkish, Neutral, Dovish
    const [regulatoryEnvironment, setRegulatoryEnvironment] = useState('Neutral'); // Positive, Neutral, Negative
    const [institutionalFlows, setInstitutionalFlows] = useState(''); // USD value, e.g., 100000000 for $100M inflow

    // New Sentiment Inputs
    const [fundingRate, setFundingRate] = useState(''); // e.g., 0.01 for 0.01%
    const [openInterest, setOpenInterest] = useState(''); // USD value

    // Refs for technical indicators (simulated for demonstration)
    const sma50Ref = useRef(null);
    const sma200Ref = useRef(null);
    const rsiRef = useRef(null);
    const adxRef = useRef(null);
    const macdLineRef = useRef(null);
    const macdSignalLineRef = useRef(null);
    const volumeRef = useRef(null);
    const atrRef = useRef(null); // For dynamic SL/TP

    const [analysisSummary, setAnalysisSummary] = useState('');
    const [tradeSignal, setTradeSignal] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [error, setError] = useState('');

    // Function to call the LLM for analysis summary
    const fetchAnalysisSummary = async () => {
        setIsLoadingAnalysis(true);
        setError('');
        setAnalysisSummary('');

        const prompt = `Provide a concise summary of the *most recent* fundamental, sentiment, and statistical analysis for BTC/USD. Focus on key drivers, market mood (e.g., Fear & Greed Index implications, institutional vs. retail), and significant technical/statistical observations (e.g., major moving average positions, RSI levels, volatility trends). Conclude with a brief outlook on where BTC/USD is generally headed based on this combined analysis. Please provide data as of July 2025.`;

        try {
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            const apiKey = "AIzaSyCSXMOVmGbT5LezJXVtR72Frm9VU1QMT4w";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${errorData.error.message || response.statusText}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                setAnalysisSummary(result.candidates[0].content.parts[0].text);
            } else {
                setError('Could not retrieve analysis summary. Unexpected API response structure.');
            }
        } catch (err) {
            console.error("Error fetching analysis:", err);
            setError(`Failed to fetch analysis: ${err.message}. Please try again.`);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };

    // Function to run the trading algorithm
    const runAlgorithm = () => {
        setError('');
        setTradeSignal('');
        setStopLoss('');
        setTakeProfit('');

        const price = parseFloat(currentPrice);
        const fgIndex = parseInt(fearGreedIndex);
        const sma50 = parseFloat(sma50Ref.current.value);
        const sma200 = parseFloat(sma200Ref.current.value);
        const rsi = parseFloat(rsiRef.current.value);
        const adx = parseFloat(adxRef.current.value);
        const macdLine = parseFloat(macdLineRef.current.value);
        const macdSignalLine = parseFloat(macdSignalLineRef.current.value);
        const volume = parseFloat(volumeRef.current.value);
        const atr = parseFloat(atrRef.current.value);


        // Input validation
        if (isNaN(price) || isNaN(fgIndex) || isNaN(sma50) || isNaN(sma200) || isNaN(rsi) || isNaN(adx) || isNaN(macdLine) || isNaN(macdSignalLine) || isNaN(volume) || isNaN(atr)) {
            setError('Please enter valid numeric values for all inputs.');
            return;
        }
        if (fgIndex < 0 || fgIndex > 100) {
            setError('Fear & Greed Index must be between 0 and 100.');
            return;
        }
        if (rsi < 0 || rsi > 100) {
            setError('RSI must be between 0 and 100.');
            return;
        }
        if (adx < 0 || adx > 100) {
            setError('ADX must be between 0 and 100.');
            return;
        }
        if (atr <= 0) {
            setError('ATR must be a positive value.');
            return;
        }

        // --- Algorithmic Trading Logic ---

        let signal = 'HOLD';
        let confidence = 0; // Higher confidence for stronger signals

        // 1. Fundamental Analysis (User Input/LLM based)
        let fundamentalScore = 0;
        if (fundamentalOutlook === 'Bullish') fundamentalScore += 2;
        else if (fundamentalOutlook === 'Bearish') fundamentalScore -= 2;

        if (interestRateOutlook === 'Dovish') fundamentalScore += 1; // Lower rates generally bullish for crypto
        else if (interestRateOutlook === 'Hawkish') fundamentalScore -= 1; // Higher rates generally bearish for crypto

        if (regulatoryEnvironment === 'Positive') fundamentalScore += 1;
        else if (regulatoryEnvironment === 'Negative') fundamentalScore -= 1;

        const instFlows = parseFloat(institutionalFlows);
        if (!isNaN(instFlows)) {
            if (instFlows > 10000000) fundamentalScore += 2; // Significant inflow
            else if (instFlows > 0) fundamentalScore += 1; // Positive inflow
            else if (instFlows < -10000000) fundamentalScore -= 2; // Significant outflow
            else if (instFlows < 0) fundamentalScore -= 1; // Negative outflow
        }

        // 2. Sentiment Analysis
        let sentimentScore = 0;
        if (fgIndex <= 20) sentimentScore += 2; // Extreme Fear - Potential Buy (Contrarian)
        else if (fgIndex >= 80) sentimentScore -= 2; // Extreme Greed - Potential Sell (Contrarian)
        else if (fgIndex > 50 && fgIndex < 80) sentimentScore += 1; // Greed but not extreme - mild bullish (trend-following)
        else if (fgIndex < 50 && fgIndex > 20) sentimentScore -= 1; // Fear but not extreme - mild bearish (trend-following)

        const fRate = parseFloat(fundingRate);
        if (!isNaN(fRate)) {
            if (fRate > 0.05) sentimentScore -= 1; // High positive funding rate - potential overbought
            else if (fRate < -0.05) sentimentScore += 1; // High negative funding rate - potential oversold
        }

        const opInterest = parseFloat(openInterest);
        if (!isNaN(opInterest) && volume > 0) { // Check for volume to confirm OI moves
            if (price > sma50 && opInterest > (opInterest * 1.05)) sentimentScore += 1; // Price up, OI up - bullish confirmation
            else if (price < sma50 && opInterest < (opInterest * 0.95)) sentimentScore -= 1; // Price down, OI down - bearish confirmation
        }


        // 3. Statistical/Technical Analysis
        let technicalScore = 0;

        // Trend Confirmation (SMA Crossover)
        if (sma50 > sma200) { // Uptrend
            technicalScore += 2;
            if (price > sma50) technicalScore += 1; // Price above short-term MA
        } else if (sma50 < sma200) { // Downtrend
            technicalScore -= 2;
            if (price < sma50) technicalScore -= 1; // Price below short-term MA
        }

        // Momentum (RSI)
        if (rsi < 30) technicalScore += 1; // Oversold - Potential Buy
        else if (rsi > 70) technicalScore -= 1; // Overbought - Potential Sell

        // Trend Strength (ADX)
        if (adx > 25) { // Strong trend
            if (sma50 > sma200) technicalScore += 1; // Strong uptrend
            else if (sma50 < sma200) technicalScore -= 1; // Strong downtrend
        }

        // MACD Crossover
        if (macdLine > macdSignalLine && macdLineRef.current.value < 0) technicalScore += 1; // Bullish crossover from below zero
        else if (macdLine < macdSignalLine && macdLineRef.current.value > 0) technicalScore -= 1; // Bearish crossover from above zero

        // Volume Confirmation
        // This is a simplified check. In real trading, you'd compare current volume to average volume.
        if (volume > (volume * 1.2)) { // If volume is significantly higher than average (simplified)
            if (signal === 'BUY') technicalScore += 1;
            else if (signal === 'SELL') technicalScore += 1; // High volume confirms direction
        }


        // Combine scores to determine signal
        const totalScore = fundamentalScore + sentimentScore + technicalScore;

        if (totalScore >= 4) { // Strong Buy
            signal = 'BUY';
            confidence = totalScore;
        } else if (totalScore >= 1) { // Mild Buy
            signal = 'BUY';
            confidence = totalScore;
        } else if (totalScore <= -4) { // Strong Sell
            signal = 'SELL';
            confidence = Math.abs(totalScore);
        } else if (totalScore <= -1) { // Mild Sell
            signal = 'SELL';
            confidence = Math.abs(totalScore);
        } else { // Neutral
            signal = 'HOLD';
            confidence = 0;
        }

        setTradeSignal(signal);

        // Calculate Stop Loss and Take Profit using ATR (e.g., 2x ATR for SL, 4x ATR for TP for 2:1 R:R)
        const stopLossATRMultiplier = 2;
        const takeProfitATRMultiplier = stopLossATRMultiplier * 2; // For 2:1 R:R

        if (signal === 'BUY') {
            const calculatedSL = price - (atr * stopLossATRMultiplier);
            const calculatedTP = price + (atr * takeProfitATRMultiplier);
            setStopLoss(calculatedSL.toFixed(2));
            setTakeProfit(calculatedTP.toFixed(2));
        } else if (signal === 'SELL') {
            const calculatedSL = price + (atr * stopLossATRMultiplier);
            const calculatedTP = price - (atr * takeProfitATRMultiplier);
            setStopLoss(calculatedSL.toFixed(2));
            setTakeProfit(calculatedTP.toFixed(2));
        }
    };

    // Initial fetch of analysis summary on component mount
    useEffect(() => {
        fetchAnalysisSummary();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-inter text-gray-800">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl border border-gray-200">
                <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">
                    <Lightbulb className="inline-block mr-2" /> BTC/USD Algorithmic Trading Simulator (Enhanced)
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    This tool simulates an algorithmic trading strategy for BTC/USD based on combined fundamental, sentiment, and technical/statistical analysis.
                    <span className="font-semibold text-red-600 block mt-2">
                        Disclaimer: This is for educational and demonstrative purposes only and does not involve real trading or live market data.
                    </span>
                </p>

                {/* Analysis Summary Section */}
                <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h2 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                        <Info className="inline-block mr-2" /> Latest Market Analysis (Simulated)
                        <button
                            onClick={fetchAnalysisSummary}
                            className={`ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 flex items-center ${isLoadingAnalysis ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={isLoadingAnalysis}
                        >
                            <RefreshCcw className={`mr-2 ${isLoadingAnalysis ? 'animate-spin' : ''}`} size={18} />
                            {isLoadingAnalysis ? 'Fetching...' : 'Refresh Analysis'}
                        </button>
                    </h2>
                    {error && <p className="text-red-500 mb-4 flex items-center"><AlertCircle className="mr-2" size={18} />{error}</p>}
                    {analysisSummary ? (
                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {analysisSummary}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Click "Refresh Analysis" to get the latest simulated market overview.</p>
                    )}
                </div>

                {/* Input Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Core Inputs */}
                    <div>
                        <label htmlFor="currentPrice" className="block text-sm font-medium text-gray-700 mb-1">Current BTC/USD Price:</label>
                        <input
                            type="number"
                            id="currentPrice"
                            value={currentPrice}
                            onChange={(e) => setCurrentPrice(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 120000"
                        />
                    </div>
                    <div>
                        <label htmlFor="fearGreedIndex" className="block text-sm font-medium text-gray-700 mb-1">Fear & Greed Index (0-100):</label>
                        <input
                            type="number"
                            id="fearGreedIndex"
                            value={fearGreedIndex}
                            onChange={(e) => setFearGreedIndex(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 65"
                            min="0"
                            max="100"
                        />
                    </div>

                    {/* Enhanced Fundamental Inputs */}
                    <div>
                        <label htmlFor="fundamentalOutlook" className="block text-sm font-medium text-gray-700 mb-1">Overall Fundamental Outlook:</label>
                        <select
                            id="fundamentalOutlook"
                            value={fundamentalOutlook}
                            onChange={(e) => setFundamentalOutlook(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Bullish">Bullish</option>
                            <option value="Neutral">Neutral</option>
                            <option value="Bearish">Bearish</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="interestRateOutlook" className="block text-sm font-medium text-gray-700 mb-1">USD Interest Rate Outlook:</label>
                        <select
                            id="interestRateOutlook"
                            value={interestRateOutlook}
                            onChange={(e) => setInterestRateOutlook(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Hawkish">Hawkish (Higher Rates)</option>
                            <option value="Neutral">Neutral</option>
                            <option value="Dovish">Dovish (Lower Rates)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="regulatoryEnvironment" className="block text-sm font-medium text-gray-700 mb-1">Regulatory Environment:</label>
                        <select
                            id="regulatoryEnvironment"
                            value={regulatoryEnvironment}
                            onChange={(e) => setRegulatoryEnvironment(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Positive">Positive</option>
                            <option value="Neutral">Neutral</option>
                            <option value="Negative">Negative</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="institutionalFlows" className="block text-sm font-medium text-gray-700 mb-1">Recent Institutional Flows (USD, Net):</label>
                        <input
                            type="number"
                            id="institutionalFlows"
                            value={institutionalFlows}
                            onChange={(e) => setInstitutionalFlows(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 50000000 (for $50M inflow)"
                        />
                    </div>

                    {/* Enhanced Sentiment Inputs */}
                    <div>
                        <label htmlFor="fundingRate" className="block text-sm font-medium text-gray-700 mb-1">Funding Rate (e.g., 0.01 for 0.01%):</label>
                        <input
                            type="number"
                            id="fundingRate"
                            value={fundingRate}
                            onChange={(e) => setFundingRate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 0.01"
                            step="0.0001"
                        />
                    </div>
                    <div>
                        <label htmlFor="openInterest" className="block text-sm font-medium text-gray-700 mb-1">Open Interest (USD):</label>
                        <input
                            type="number"
                            id="openInterest"
                            value={openInterest}
                            onChange={(e) => setOpenInterest(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 15000000000 (for $15B)"
                        />
                    </div>

                    {/* Technical/Statistical Inputs */}
                    <div>
                        <label htmlFor="sma50" className="block text-sm font-medium text-gray-700 mb-1">50-Period Simple Moving Average (SMA):</label>
                        <input
                            type="number"
                            id="sma50"
                            ref={sma50Ref}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 118000"
                        />
                    </div>
                    <div>
                        <label htmlFor="sma200" className="block text-sm font-medium text-gray-700 mb-1">200-Period Simple Moving Average (SMA):</label>
                        <input
                            type="number"
                            id="sma200"
                            ref={sma200Ref}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 110000"
                        />
                    </div>
                    <div>
                        <label htmlFor="rsi" className="block text-sm font-medium text-gray-700 mb-1">Relative Strength Index (RSI 0-100):</label>
                        <input
                            type="number"
                            id="rsi"
                            ref={rsiRef}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 60"
                            min="0"
                            max="100"
                        />
                    </div>
                    <div>
                        <label htmlFor="adx" className="block text-sm font-medium text-gray-700 mb-1">Average Directional Index (ADX 0-100):</label>
                        <input
                            type="number"
                            id="adx"
                            ref={adxRef}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 30"
                            min="0"
                            max="100"
                        />
                    </div>
                    <div>
                        <label htmlFor="macdLine" className="block text-sm font-medium text-gray-700 mb-1">MACD Line:</label>
                        <input
                            type="number"
                            id="macdLine"
                            ref={macdLineRef}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 1500"
                        />
                    </div>
                    <div>
                        <label htmlFor="macdSignalLine" className="block text-sm font-medium text-gray-700 mb-1">MACD Signal Line:</label>
                        <input
                            type="number"
                            id="macdSignalLine"
                            ref={macdSignalLineRef}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 1400"
                        />
                    </div>
                    <div>
                        <label htmlFor="volume" className="block text-sm font-medium text-gray-700 mb-1">24h Trading Volume (USD):</label>
                        <input
                            type="number"
                            id="volume"
                            ref={volumeRef}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 70000000000 (for $70B)"
                        />
                    </div>
                    <div>
                        <label htmlFor="atr" className="block text-sm font-medium text-gray-700 mb-1">Average True Range (ATR):</label>
                        <input
                            type="number"
                            id="atr"
                            ref={atrRef}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 2500 (for $2500 ATR)"
                            min="0"
                        />
                    </div>
                </div>

                {/* Run Algorithm Button */}
                <button
                    onClick={runAlgorithm}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors duration-200 shadow-md"
                >
                    Run Algorithmic Analysis & Get Trade Signal
                </button>

                {/* Output Section */}
                {tradeSignal && (
                    <div className="mt-8 p-6 rounded-lg border border-gray-300 bg-gray-50">
                        <h2 className="text-xl font-semibold text-center text-indigo-700 mb-4">Trade Signal:</h2>
                        <div className={`text-center text-3xl font-bold p-4 rounded-lg ${
                            tradeSignal === 'BUY' ? 'bg-green-100 text-green-700 border-green-300' :
                            tradeSignal === 'SELL' ? 'bg-red-100 text-red-700 border-red-700' :
                            'bg-yellow-100 text-yellow-700 border-yellow-300'
                        } flex items-center justify-center`}>
                            {tradeSignal === 'BUY' && <TrendingUp className="mr-3" size={32} />}
                            {tradeSignal === 'SELL' && <TrendingDown className="mr-3" size={32} />}
                            {tradeSignal === 'HOLD' && <Info className="mr-3" size={32} />}
                            {tradeSignal}
                        </div>
                        {tradeSignal !== 'HOLD' && (
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
                                <div className="p-4 bg-gray-100 rounded-md border border-gray-200">
                                    <p className="font-medium text-gray-700">Stop Loss:</p>
                                    <p className="text-red-600 font-bold">${stopLoss}</p>
                                </div>
                                <div className="p-4 bg-gray-100 rounded-md border border-gray-200">
                                    <p className="font-medium text-gray-700">Take Profit:</p>
                                    <p className="text-green-600 font-bold">${takeProfit}</p>
                                </div>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 text-center mt-4 italic">
                            These signals are based on the simulated inputs and predefined logic.
                            Always conduct your own thorough research before making any trading decisions.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;