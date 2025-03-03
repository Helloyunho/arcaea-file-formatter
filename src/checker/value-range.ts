import {
  AFFChecker,
  AFFInt,
  AFFError,
  WithLocation,
  AFFItem,
  AFFErrorLevel,
  AFFErrorType
} from '../types.js'

export const valueRangeChecker: AFFChecker = (file, errors) => {
  for (const item of file.items) {
    checkItem(item, errors)
  }
}

const checkItem = (
  { data, location }: WithLocation<AFFItem>,
  errors: AFFError[]
) => {
  if (data.kind === 'timing') {
    checkTimestamp(data.time, errors)
    if (data.bpm.data.value !== 0 && data.measure.data.value === 0) {
      errors.push({
        message: `Timing event with non-zero bpm should not have zero beats per segment`,
        type: AFFErrorType.NonZeroBPMNonZeroBeats,
        severity: AFFErrorLevel.Error,
        location: data.measure.location
      })
    }
    if (data.bpm.data.value === 0 && data.measure.data.value !== 0) {
      errors.push({
        message: `Timing event with zero bpm should have zero beats per segment`,
        type: AFFErrorType.ZeroBPMZeroBeats,
        severity: AFFErrorLevel.Info,
        location: data.measure.location
      })
    }
  } else if (data.kind === 'tap') {
    checkTimestamp(data.time, errors)
  } else if (data.kind === 'hold') {
    checkTimestamp(data.start, errors)
    checkTimestamp(data.end, errors)
    if (data.start.data.value >= data.end.data.value) {
      errors.push({
        message: `Hold event should have a positive time length`,
        type: AFFErrorType.HoldPositiveDuration,
        severity: AFFErrorLevel.Error,
        location: location
      })
    }
  } else if (data.kind === 'arc') {
    checkTimestamp(data.start, errors)
    checkTimestamp(data.end, errors)
    if (data.start.data.value > data.end.data.value) {
      errors.push({
        message: `Arc event should have a non-negative time length`,
        type: AFFErrorType.ArcNonNegativeDuration,
        severity: AFFErrorLevel.Error,
        location: location
      })
    }
    if (data.start.data.value === data.end.data.value) {
      if (
        data.xStart.data.value === data.xEnd.data.value &&
        data.yStart.data.value === data.yEnd.data.value
      ) {
        errors.push({
          message: `Arc event with zero time length should have different start point and end point`,
          type: AFFErrorType.ArcZeroDurationDifferentPoints,
          severity: AFFErrorLevel.Error,
          location: location
        })
      }
      if (data.arcKind.data.value !== 's') {
        errors.push({
          message: `Arc event with zero time length should be "s" type`,
          type: AFFErrorType.ArcZeroDurationSType,
          severity: AFFErrorLevel.Info,
          location: data.arcKind.location
        })
      }
      if (data.arctaps) {
        errors.push({
          message: `Arc event with zero time length should not have arctap events on it`,
          type: AFFErrorType.ArcZeroDurationNoArctap,
          severity: AFFErrorLevel.Error,
          location: data.arctaps.location
        })
      }
    }
    if (
      data.effect.data.value !== 'none' &&
      !data.effect.data.value.endsWith('_wav')
    ) {
      errors.push({
        message: `Arc event with effect "${data.effect.data.value}"  is not known by us`,
        type: AFFErrorType.ArcEffectUnknown,
        severity: AFFErrorLevel.Warning,
        location: data.effect.location
      })
    }
    if (!data.isLine.data.value && data.arctaps) {
      errors.push({
        message: `Arc event with arctap events on it will be treated as not solid even it is specified as solid`,
        type: AFFErrorType.ArcArctapNotSolid,
        severity: AFFErrorLevel.Warning,
        location: data.isLine.location
      })
    }
    if (
      !data.isLine.data.value &&
      data.arctaps === undefined &&
      data.colorId.data.value === 3
    ) {
      errors.push({
        message: `Solid arc event should not use the color 3`,
        type: AFFErrorType.ArcSolidColor3,
        severity: AFFErrorLevel.Error,
        location: data.colorId.location
      })
    }
    if (data.arctaps) {
      for (const arctap of data.arctaps.data) {
        if (
          arctap.data.time.data.value < data.start.data.value ||
          arctap.data.time.data.value > data.end.data.value
        ) {
          errors.push({
            message: `Arctap event should happens in the time range of parent arc event`,
            type: AFFErrorType.ArcArctapInTimeRange,
            severity: AFFErrorLevel.Error,
            location: arctap.location
          })
        }
      }
    }
  } else if (data.kind === 'camera') {
    if (data.duration.data.value < 0) {
      errors.push({
        message: `Camera event should have non negative duration`,
        type: AFFErrorType.CameraNonNegativeDuration,
        severity: AFFErrorLevel.Error,
        location: data.duration.location
      })
    }
  } else if (data.kind === 'timinggroup') {
    for (const item of data.items.data) {
      checkItem(item, errors)
    }
  }
}

const checkTimestamp = (
  timestamp: WithLocation<AFFInt>,
  errors: AFFError[]
) => {
  if (timestamp.data.value < 0) {
    errors.push({
      message: `Timestamp should not be negative`,
      type: AFFErrorType.TimestampNonNegative,
      severity: AFFErrorLevel.Error,
      location: timestamp.location
    })
  }
}
