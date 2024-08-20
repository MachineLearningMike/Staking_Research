import numpy as np
import matplotlib.pyplot as plt
import os
import json

plt.rcParams.update({
    "text.usetex": True,
    "font.family": "sans-serif",
    "font.sans-serif": "Helvetica",
    "font.size": 12
    # 'legend.fontsize': 12
})

CS = "Simple"
FixedFree = "Fixed"

files = [   # title, filename, scale, ylim

    ("{} Interest pendency tracker".format(CS), "z_{}InterestPendency.txt".format(CS), 1e-27, 3.0e-21),
    ("{} Burn pendency tracker".format(CS), "z_{}BurnPendency.txt".format(CS), 1e-27, 2.0e-16),
    # ("{} Interest activity tracker".format(CS), "z_{}InterestActivity.txt".format(CS), 1e-27, 2.9e-21),
    # ("{} Burn activity tracker".format(CS), "z_{}BurnActivity.txt".format(CS), 1e-27, 2.2e-16),

    # ("{} Interest pendency random tracker".format(CS), "z_{}InterestPendencyRandom.txt".format(CS), 1e-27, 1.8e-18),
    # ("{} Burn pendency random tracker".format(CS), "z_{}BurnPendencyRandom.txt".format(CS), 1e-27, 1.3e-22),
    # ("{} Interest activity random tracker".format(CS), "z_{}InterestActivityRandom.txt".format(CS), 1e-27, 6.1e-19),
    # ("{} Burn activity random tracker".format(CS), "z_{}BurnActivityRandom.txt".format(CS), 1e-27, 1.3e-22),
]

def linearRegression(x, y):
    a = np.vstack([x, np.ones(len(x))]).T
    m, c = np.linalg.lstsq(a, y, rcond=None)[0]
    return m, c    # regression: y = m * x + c

def getRowsCols(n):
    rows = np.power(n, 0.5)
    cols = (n / rows)
    nRows, nCols = None, None
    if int(rows) < rows:
        if int(rows) * int(cols) >= rows * cols:
            nRows, nCols = int(rows), int(cols)
        else:
            if int(rows) * int(cols+1.) >= rows * cols:
                nRows, nCols = int(rows), int(cols+1.)
            else:
                nRows, nCols = int(rows+1.), int(cols+1.)
    else:
        nRows, nCols = int(rows), int(cols+.5)
        
    return nRows, nCols

def flatten2DList(list2d):
    list2d = np.array(list2d)
    return list(list2d.flatten())

def shareTicks(axesList, nRows, nCols):
    for a in range(len(axesList)):
        if a % nCols > 0:  # not a left ax
            axesList[a].sharey_foreign(axesList[0])
        if len(axesList) - a < nCols: # bottom ax
            axesList[a].sharex_foreign(axesList[max(0, a-nCols)])

nRows, nCols = getRowsCols(len(files))
nRows = 1
nCols = 2

fig = plt.figure(figsize=(17, 3))
axes = fig.subplots(nrows=nRows, ncols=nCols, sharex=False)
# plt.pyplot.subplots_adjust(left=None, bottom=None, right=None, top=None, wspace=None, hspace=None)
plt.subplots_adjust(left=0.07, right=0.97, top=0.75, bottom=0.2, wspace=0.1, hspace=1.2)  # height space, not horizontal space
axes = flatten2DList(axes)
# del axes[len(files):]

# fig.tight_layout()

alignment = {'horizontalalignment': 'center', 'verticalalignment': 'baseline'}
fig.suptitle("Total rewards in simple tasks".format(FixedFree), fontsize=20, color = 'darkblue')
# fig.suptitle("Absolute errors in {} Total Principal test mode".format(FixedFree), fontsize=20)
axTitles = [
    "{} Interest".format(CS),
    "{} Burn".format(CS),
    # "{} Interest activity".format(CS),
    # "{} Burn activity".format(CS),

    # "{} Interest pendency random tracker".format(CS),
    # "{} Burn pendency random tracker".format(CS),
    # "{} Interest activity random tracker".format(CS),
    # "{} Burn activity random tracker".format(CS),
]
xLabel = "relative block.number" # "transaction" #
yLabel = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
]


# fig.suptitle("Algorithms compared in Fixed Total Principal mode", fontsize=18)

# fig.text(0.07, 0.103, "1. Compound Interest implements: $asset[user] += asset[user] \\times ((1+rate) ^ {blocks/cycle} - 1)$, \
# while Compound Burn implements: $asset[user] -= asset[user] \\times (1 - (1-rate) ^ {block/cycle})$", fontsize=11)
# fig.text(0.07, 0.073, "2. $relative$ $error = abs(totalBalance() - \sum_{user \in U} balance(user)) / max (totalBalance(), \sum_{user \in U} balance(user))$", fontsize=11)
# fig.text(0.07, 0.043, "3. A $relative$ $error$ of zero is less than a $10^{27}$-th", fontsize=11)

for ax in range(len(axTitles)):
    axes[ax].set_title(axTitles[ax], color='darkblue')
    axes[ax].set_xlabel(xLabel)
    axes[ax].set_ylabel(yLabel[ax])

for fileNo in range(len(files)):
    # filePath = os.path.join(".\\", "test_data", files[idx])
    filePath = os.path.join(os.getcwd(), "visualize", "test_data", files[fileNo][1])
                      
    file = open(filePath, "r")
    string = file.read()
    array = json.loads(string)[:-5]
    array = [int(s) for s in array] # exact

    ar = []; i = 0
    while i < len(array)-1:
        ar.append([array[i], array[i+1], array[i+2], array[i+3], array[i+4], array[i+5], array[i+6]])
        i += 7

    collective = [a[0] for a in ar]
    marginal = [a[1] for a in ar]
    solidityTruth = [a[2] for a in ar]
    javascriptTruth = [a[3] for a in ar]
    blockNo = [a[6] for a in ar]

    for ax in range(len(axTitles)):
        if (files[fileNo][0].upper().find(axTitles[ax].upper()) >= 0):
            if (ax==0):
                axes[ax].plot(blockNo, np.array(marginal), label="totalRewards", linewidth=1.0)
                axes[ax].legend(loc="upper left")
            else:
                axes[ax].plot(blockNo, np.array(marginal), label="totalRewards", linewidth=1.0)
                axes[ax].legend(loc="upper left")

            if ax < len(axTitles) - 2:
                axes[ax].xaxis.label.set_visible(False)

# handles, labels = axes[0].get_legend_handles_labels()
# fig.legend(handles=handles, labels=labels, ncols=4, loc="lower center")

plt.show()

