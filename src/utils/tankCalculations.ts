/**
 * Utility functions for tank-related calculations
 */

/**
 * Calculates the final tank level with only integer values
 * @param currentLevel Current tank level
 * @param expectedDelivery Expected delivery amount
 * @param expectedSales Expected sales amount
 * @param additionalQuantity Additional quantity (from user input)
 * @param formatted If true, returns a formatted string with thousands separator
 * @returns The calculated final tank level as an integer (no decimals)
 */
export function calculateTotalFinal(
  currentLevel: number, 
  expectedDelivery: number = 0, 
  expectedSales: number = 0, 
  additionalQuantity: number = 0,
  formatted: boolean = false
): number | string {
  // Calculate the total and ensure it's an integer with Math.floor
  const total = Math.floor(currentLevel + expectedDelivery - expectedSales + additionalQuantity);
  
  // Return formatted string or raw number based on the parameter
  return formatted ? total.toLocaleString() : total;
}
