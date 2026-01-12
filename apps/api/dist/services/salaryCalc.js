export function calcSlotSalary(opts) {
    const grace = opts.graceMinutes ?? 5;
    const slotsSorted = [...opts.slots].sort((a, b) => a.endMinutes - b.endMinutes);
    const proposedSlots = slotsSorted.filter((s) => opts.minutesSinceStartOfDay >= s.endMinutes).length;
    const proposedSalary = slotsSorted
        .slice(0, proposedSlots)
        .reduce((sum, s) => sum + s.salary, 0);
    if (proposedSlots <= 0) {
        return {
            proposedSlots,
            proposedSalary,
            isLate: false,
            lateByMinutes: 0,
            warningMessage: ""
        };
    }
    const lastEnd = slotsSorted[proposedSlots - 1].endMinutes;
    const lateBy = opts.minutesSinceStartOfDay - (lastEnd + grace);
    const isLate = lateBy > 0;
    return {
        proposedSlots,
        proposedSalary,
        isLate,
        lateByMinutes: isLate ? lateBy : 0,
        warningMessage: isLate
            ? `Late by ${lateBy} minute(s). Your attendance is pending admin approval.`
            : ""
    };
}
