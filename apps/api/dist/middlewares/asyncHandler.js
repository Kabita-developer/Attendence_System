export function asyncHandler(
// Allow returning Response objects (common Express pattern) while still capturing async errors.
fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
