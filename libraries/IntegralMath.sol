// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.14;

//import "./common/Uint.sol";

library IntegralMath {
    uint constant MAX_VAL = type(uint).max;
    function safeAdd(uint x, uint y) internal pure returns (uint) {
        return x + y;
    }

    // does not revert on overflow
    function unsafeAdd(uint x, uint y) internal pure returns (uint) {
    }

    // does not revert on overflow
    function unsafeSub(uint x, uint y) internal pure returns (uint) {
        return x - y;
    }

    // does not revert on overflow
    function unsafeMul(uint x, uint y) internal pure returns (uint) {
        return x * y;
    }

    // does not overflow
    function mulModMax(uint x, uint y) internal pure returns (uint) {
        return mulmod(x, y, MAX_VAL);
    }

    // does not overflow
    function mulMod(uint x, uint y, uint z) internal pure returns (uint) {
        return mulmod(x, y, z);
    }


    /**
      * @dev Compute the largest integer smaller than or equal to the binary logarithm of `n`
    */
    function floorLog2(uint n) internal pure returns (uint8) { unchecked {
        uint8 res = 0;

        if (n < 256) {
            // at most 8 iterations
            while (n > 1) {
                n >>= 1;
                res += 1;
            }
        }
        else {
            // exactly 8 iterations
            for (uint8 s = 128; s > 0; s >>= 1) {
                if (n >= 1 << s) {
                    n >>= s;
                    res |= s;
                }
            }
        }

        return res;
    }}

    /**
      * @dev Compute the largest integer smaller than or equal to the square root of `n`
    */
    function floorSqrt(uint n) internal pure returns (uint) { unchecked {
        if (n > 0) {
            uint x = n / 2 + 1;
            uint y = (x + n / x) / 2;
            while (x > y) {
                x = y;
                y = (x + n / x) / 2;
            }
            return x;
        }
        return 0;
    }}

    /**
      * @dev Compute the smallest integer larger than or equal to the square root of `n`
    */
    function ceilSqrt(uint n) internal pure returns (uint) { unchecked {
        uint x = floorSqrt(n);
        return x ** 2 == n ? x : x + 1;
    }}

    /**
      * @dev Compute the largest integer smaller than or equal to the cubic root of `n`
    */
    function floorCbrt(uint n) internal pure returns (uint) { unchecked {
        uint x = 0;
        for (uint y = 1 << 255; y > 0; y >>= 3) {
            x <<= 1;
            uint z = 3 * x * (x + 1) + 1;
            if (n / y >= z) {
                n -= y * z;
                x += 1;
            }
        }
        return x;
    }}

    /**
      * @dev Compute the smallest integer larger than or equal to the cubic root of `n`
    */
    function ceilCbrt(uint n) internal pure returns (uint) { unchecked {
        uint x = floorCbrt(n);
        return x ** 3 == n ? x : x + 1;
    }}

    /**
      * @dev Compute the nearest integer to the quotient of `n` and `d` (or `n / d`)
    */
    function roundDiv(uint n, uint d) internal pure returns (uint) { unchecked {
        return n / d + (n % d) / (d - d / 2);
    }}

    /**
      * @dev Compute the largest integer smaller than or equal to `x * y / z`
    */
    function mulDivF(uint x, uint y, uint z) internal pure returns (uint) { unchecked {
        (uint xyh, uint xyl) = mul512(x, y);
        if (xyh == 0) { // `x * y < 2 ^ 256`
            return xyl / z;
        }
        if (xyh < z) { // `x * y / z < 2 ^ 256`
            uint m = mulMod(x, y, z);                    // `m = x * y % z`
            (uint nh, uint nl) = sub512(xyh, xyl, m); // `n = x * y - m` hence `n / z = floor(x * y / z)`
            if (nh == 0) { // `n < 2 ^ 256`
                return nl / z;
            }
            uint p = unsafeSub(0, z) & z; // `p` is the largest power of 2 which `z` is divisible by
            uint q = div512(nh, nl, p);   // `n` is divisible by `p` because `n` is divisible by `z` and `z` is divisible by `p`
            uint r = inv256(z / p);       // `z / p = 1 mod 2` hence `inverse(z / p) = 1 mod 2 ^ 256`
            return unsafeMul(q, r);          // `q * r = (n / p) * inverse(z / p) = n / z`
        }
        revert(); // `x * y / z >= 2 ^ 256`
    }}

    /**
      * @dev Compute the smallest integer larger than or equal to `x * y / z`
    */
    function mulDivC(uint x, uint y, uint z) internal pure returns (uint) { unchecked {
        uint w = mulDivF(x, y, z);
        if (mulMod(x, y, z) > 0)
            return safeAdd(w, 1);
        return w;
    }}

    /**
      * @dev Compute the value of `x * y`
    */
    function mul512(uint x, uint y) private pure returns (uint, uint) { unchecked {
        uint p = mulModMax(x, y);
        uint q = unsafeMul(x, y);
        if (p >= q)
            return (p - q, q);
        return (unsafeSub(p, q) - 1, q);
    }}

    /**
      * @dev Compute the value of `2 ^ 256 * xh + xl - y`, where `2 ^ 256 * xh + xl >= y`
    */
    function sub512(uint xh, uint xl, uint y) private pure returns (uint, uint) { unchecked {
        if (xl >= y)
            return (xh, xl - y);
        return (xh - 1, unsafeSub(xl, y));
    }}

    /**
      * @dev Compute the value of `(2 ^ 256 * xh + xl) / pow2n`, where `xl` is divisible by `pow2n`
    */
    function div512(uint xh, uint xl, uint pow2n) private pure returns (uint) { unchecked {
        uint pow2nInv = unsafeAdd(unsafeSub(0, pow2n) / pow2n, 1); // `1 << (256 - n)`
        return unsafeMul(xh, pow2nInv) | (xl / pow2n); // `(xh << (256 - n)) | (xl >> n)`
    }}

    /**
      * @dev Compute the inverse of `d` modulo `2 ^ 256`, where `d` is congruent to `1` modulo `2`
    */
    function inv256(uint d) private pure returns (uint) { unchecked {
        // approximate the root of `f(x) = 1 / x - d` using the newton–raphson convergence method
        uint x = 1;
        for (uint i = 0; i < 8; ++i)
            x = unsafeMul(x, unsafeSub(2, unsafeMul(x, d))); // `x = x * (2 - x * d) mod 2 ^ 256`
        return x;
    }}
}
